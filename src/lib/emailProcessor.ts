// src/lib/emailProcessor.ts
import { Message, InternetMessageHeader } from '@microsoft/microsoft-graph-types';
import * as graphService from '@/lib/graphService';
import * as alertService from '@/lib/alertService';
import { db } from '@/db';
import { tickets, users, ticketComments, ticketPriorityEnum, ticketStatusEnum, ticketTypeEcommerceEnum } from '@/db/schema'; // Added ticketComments
import { eq, or, inArray, sql } from 'drizzle-orm'; // Added or, inArray, sql
import { analyzeEmailContent } from '@/lib/aiService';
import { getOrderTrackingInfo, OrderTrackingInfo } from '@/lib/shipstationService'; // Import the new service
import { ticketEventEmitter } from '@/lib/eventEmitter'; // Import event emitter

// --- Constants ---
const INTERNAL_DOMAIN = process.env.INTERNAL_EMAIL_DOMAIN || "alliancechemical.com";
const DEFAULT_PRIORITY = ticketPriorityEnum.enumValues[1]; // 'medium'
const DEFAULT_STATUS = ticketStatusEnum.enumValues[0];     // 'new'
const OPEN_STATUS = ticketStatusEnum.enumValues[1];        // 'open' (Used when a reply comes in)
const DEFAULT_TYPE = 'General Inquiry' as typeof ticketTypeEcommerceEnum.enumValues[number];

// --- Helper: Find or Create User ---
async function findOrCreateUser(senderEmail: string, senderName?: string | null): Promise<string | null> {
    if (!senderEmail) {
        console.warn("EmailProcessor: Sender email missing.");
        return null;
    }

    try {
        let user = await db.query.users.findFirst({
            where: eq(users.email, senderEmail.toLowerCase()), // Ensure case-insensitive lookup
            columns: { id: true }
        });

        if (user) {
            return String(user.id); // Convert to string to match expected type (text)
        } else {
            console.log(`EmailProcessor: Creating new external user for ${senderEmail}`);
            const [newUser] = await db.insert(users).values({
                email: senderEmail.toLowerCase(),
                name: senderName || senderEmail.split('@')[0],
                password: null,
                role: 'user',
                isExternal: true,
            }).returning({ id: users.id });
            return String(newUser.id); // Convert to string to match expected type (text)
        }
    } catch (error) {
        console.error(`EmailProcessor: Error finding or creating user for ${senderEmail}:`, error);
        await alertService.trackErrorAndAlert(
            'EmailProcessor-User',
            `Failed to find or create user for ${senderEmail}`,
            error
        );
        return null;
    }
}

/**
 * Extracts and cleans message IDs from In-Reply-To or References headers.
 * @param headerValue The raw header string value.
 * @returns An array of cleaned message IDs (without angle brackets).
 */
function parseMessageIdHeader(headerValue: string | null | undefined): string[] {
    if (!headerValue) {
        return [];
    }
    // Match message IDs enclosed in <...>
    const matches = headerValue.match(/<([^>]+)>/g);
    if (!matches) {
        return [];
    }
    // Remove angle brackets and return unique IDs
    return [...new Set(matches.map(id => id.substring(1, id.length - 1)))];
}

// --- Result Interface ---
interface ProcessEmailResult {
    success: boolean;
    ticketId?: number;
    commentId?: number;
    message: string;
    skipped?: boolean;
    automation_attempted?: boolean;
    automation_info?: OrderTrackingInfo | null;
}

// --- Core Processing Function for a Single Email ---
export async function processSingleEmail(emailMessage: Message): Promise<ProcessEmailResult> {
    const messageId = emailMessage.id;
    console.log(`EmailProcessor: Starting processing for Message ID: ${messageId}`);
    let automationAttempted = false;
    let automationInfo: OrderTrackingInfo | null = null;
    let draftReplyContent: string | null = null;
    let ticketStatus: typeof ticketStatusEnum.enumValues[number] = DEFAULT_STATUS;

    try {
        // --- Basic Validation ---
        if (!messageId || !emailMessage.sender?.emailAddress?.address || !emailMessage.subject) {
            console.warn(`EmailProcessor: Skipping email ID ${messageId || 'unknown'} - missing essential info.`);
            if (messageId) {
                // Attempt to mark as read even if skipping due to bad data
                try { await graphService.markEmailAsRead(messageId); } catch (e) { console.error(`EmailProcessor: Failed to mark skipped email ${messageId} as read`, e); }
            }
            return { success: false, message: "Missing essential info (ID, sender, or subject)", skipped: true };
        }

        const senderEmail = emailMessage.sender.emailAddress.address;
        const senderName = emailMessage.sender.emailAddress.name;
        const subject = emailMessage.subject;

        // --- Domain Check (Skip Internal) ---
        if (senderEmail.toLowerCase().endsWith(`@${INTERNAL_DOMAIN.toLowerCase()}`)) {
            console.log(`EmailProcessor: Skipping internal email from ${senderEmail} (Message ID: ${messageId})`);
             try { await graphService.markEmailAsRead(messageId); } catch (e) { console.error(`EmailProcessor: Failed to mark internal email ${messageId} as read`, e); }
            return { success: true, message: "Skipped internal email", skipped: true };
        }

        // --- Threading Check ---
        console.log(`EmailProcessor: Checking threading for Message ID: ${messageId}`);
        const headers = emailMessage.internetMessageHeaders as InternetMessageHeader[] | undefined; // Type assertion
        let inReplyToId: string | undefined;
        let referenceIds: string[] = [];
        let conversationThreadId: string | null | undefined = emailMessage.conversationId;

        if (headers) {
            const inReplyToHeader = headers.find(h => h.name?.toLowerCase() === 'in-reply-to');
            const referencesHeader = headers.find(h => h.name?.toLowerCase() === 'references');

            if (inReplyToHeader?.value) {
                inReplyToId = parseMessageIdHeader(inReplyToHeader.value)[0]; // Get the first ID
                console.log(`EmailProcessor: Found In-Reply-To: ${inReplyToId}`);
            }
            if (referencesHeader?.value) {
                referenceIds = parseMessageIdHeader(referencesHeader.value);
                console.log(`EmailProcessor: Found References: ${referenceIds.join(', ')}`);
            }
        }
        if (conversationThreadId) {
            console.log(`EmailProcessor: Found Conversation ID: ${conversationThreadId}`);
        }

        // Combine potential IDs to search for in tickets.externalMessageId
        const potentialParentIds = [...new Set([inReplyToId, ...referenceIds].filter(Boolean) as string[])];

        let existingTicketId: number | null = null;
        let foundBy: string | null = null;

        // Query 1: Check headers against externalMessageId
        if (potentialParentIds.length > 0) {
            try {
                const potentialTickets = await db.query.tickets.findMany({
                    where: inArray(tickets.externalMessageId, potentialParentIds),
                    columns: { id: true },
                    limit: 1 // Usually one match is enough
                });
                if (potentialTickets.length > 0) {
                    existingTicketId = potentialTickets[0].id;
                    foundBy = 'Headers (In-Reply-To/References)';
                    console.log(`EmailProcessor: Found match via headers for Ticket ID: ${existingTicketId}`);
                }
            } catch (dbQueryError) {
                console.error("EmailProcessor: Error querying tickets by headers:", dbQueryError);
                // Log but continue to try conversationId
                await alertService.trackErrorAndAlert('EmailProcessor-ThreadQueryHeaders', 'Error querying tickets by header IDs', dbQueryError);
            }
        }

        // Query 2: Check conversationId (if header check failed or didn't run)
        if (!existingTicketId && conversationThreadId) {
            try {
                const potentialTicket = await db.query.tickets.findFirst({
                    where: eq(tickets.conversationId, conversationThreadId), // Requires conversationId column
                    columns: { id: true }
                });
                if (potentialTicket) {
                    existingTicketId = potentialTicket.id;
                    foundBy = 'Conversation ID';
                    console.log(`EmailProcessor: Found match via Conversation ID for Ticket ID: ${existingTicketId}`);
                }
            } catch (dbQueryError) {
                console.error("EmailProcessor: Error querying tickets by conversationId:", dbQueryError);
                 await alertService.trackErrorAndAlert('EmailProcessor-ThreadQueryConvId', 'Error querying tickets by conversation ID', dbQueryError);
            }
        }

        // --- Process as Reply (if existing ticket found) ---
        if (existingTicketId !== null && foundBy) {
            console.log(`EmailProcessor: Email ${messageId} is a reply to Ticket ${existingTicketId} (found by ${foundBy}). Adding as comment.`);

            // Find or create the user who sent *this reply*
            const replyCommenterId = await findOrCreateUser(senderEmail, senderName);
            if (!replyCommenterId) {
                 try { await graphService.markEmailAsRead(messageId); } catch(e){}
                 const errorMsg = `Could not find or create user for reply sender: ${senderEmail}`;
                 await alertService.trackErrorAndAlert('EmailProcessor-ReplyUser', errorMsg, { messageId, senderEmail });
                 throw new Error(errorMsg); // Fail processing this email
            }

            // Extract reply body
            const replyBody = emailMessage.body?.contentType === 'text'
                ? emailMessage.body.content ?? emailMessage.bodyPreview ?? ''
                : emailMessage.bodyPreview ?? '';

            // Insert the comment
            try {
                const [newComment] = await db.insert(ticketComments).values({
                    ticketId: existingTicketId,
                    commentText: replyBody || '(Empty Body)',
                    commenterId: replyCommenterId, // The user who sent the reply (TEXT ID)
                    isFromCustomer: true, // Mark as from customer
                    isInternalNote: false,
                    isOutgoingReply: false,
                    externalMessageId: emailMessage.internetMessageId // Store the reply's message ID
                }).returning({ id: ticketComments.id }); // Get the new comment ID

                console.log(`EmailProcessor: Added comment ${newComment.id} to ticket ${existingTicketId} for email ${messageId}.`);

                 // Mark email as read
                 await graphService.markEmailAsRead(messageId);
                 console.log(`EmailProcessor: Reply email ${messageId} marked as read.`);

                // Update ticket's updated_at timestamp and status to 'open'
                 await db.update(tickets)
                   .set({ updatedAt: new Date(), status: OPEN_STATUS }) // Set status back to 'open'
                   .where(eq(tickets.id, existingTicketId));
                 console.log(`EmailProcessor: Ticket ${existingTicketId} updated (timestamp, status set to open).`);

                return { success: true, ticketId: existingTicketId, commentId: newComment.id, message: "Reply added as comment successfully" };

            } catch (commentError: any) {
                console.error(`EmailProcessor: Error adding comment to ticket ${existingTicketId} for email ${messageId}:`, commentError);
                 // Attempt to mark read even if comment insert fails
                 try { await graphService.markEmailAsRead(messageId); } catch(e){}
                 await alertService.trackErrorAndAlert(
                    'EmailProcessor-CommentInsert',
                    `Failed to insert comment for email ${messageId} into ticket ${existingTicketId}`,
                    { error: commentError }
                 );
                throw commentError; // Propagate error to main catch block
            }
        }

        // --- Process as New Ticket (if no existing ticket found) ---
        console.log(`EmailProcessor: Email ${messageId} is not a reply to a known ticket or lookup failed. Proceeding to create new ticket.`);

        // Find or Create User
        const reporterId = await findOrCreateUser(senderEmail, senderName);
        if (!reporterId) {
             // This case should have been caught earlier, but double-check
             try { await graphService.markEmailAsRead(messageId); } catch(e){}
             throw new Error(`User creation/lookup failed earlier for ${senderEmail}`);
        }

        // Duplicate Check (using internetMessageId of *this* email)
        if (emailMessage.internetMessageId) {
            const existingTicket = await db.query.tickets.findFirst({
                where: eq(tickets.externalMessageId, emailMessage.internetMessageId),
                columns: { id: true }
            });
            if (existingTicket) {
                console.log(`EmailProcessor: Duplicate email detected (internetMessageId: ${emailMessage.internetMessageId}). Ticket ${existingTicket.id} already exists.`);
                 try { await graphService.markEmailAsRead(messageId); } catch(e){}
                return { success: true, message: `Duplicate email, already processed as ticket ${existingTicket.id}`, skipped: true };
            }
        } else {
            console.warn(`EmailProcessor: Message ID ${messageId} missing internetMessageId. Cannot perform duplicate check.`);
        }

        // Extract Email Body
        const body = emailMessage.body?.contentType === 'text'
            ? emailMessage.body.content ?? emailMessage.bodyPreview ?? ''
            : emailMessage.bodyPreview ?? '';

        // AI Analysis
        let aiAnalysis = null;
        if (subject && body) {
            try {
                aiAnalysis = await analyzeEmailContent(subject, body);
            } catch (aiError: any) {
                console.error(`EmailProcessor: AI Analysis Error for email ${messageId}:`, aiError);
                await alertService.trackErrorAndAlert(
                    'EmailProcessor-AI',
                    `AI analysis failed for email ${messageId}`,
                    { subject, bodyPreview: body.substring(0, 200), error: aiError }
                );
            }
        }

        // --- Check for CoA Request Missing Lot Number ---
        if (aiAnalysis?.likelyCustomerRequest &&
            (aiAnalysis.intent === 'documentation_request' || aiAnalysis.ticketType === 'COA Request') &&
            !aiAnalysis.lotNumber) {
            console.log(`EmailProcessor: COA request detected for email ${messageId} but missing Lot Number. Preparing info request.`);
            automationAttempted = true;

            // Prepare the draft reply
            const customerName = senderName || senderEmail.split('@')[0];
            const productName = aiAnalysis.summary.includes('for') 
                ? aiAnalysis.summary.split('for')[1].trim() 
                : "the product mentioned";

            draftReplyContent = `
Hi ${customerName},

Thank you for reaching out regarding the Certificate of Analysis (CoA).

To ensure we provide the correct document, could you please reply to this email with the Lot Number for ${productName}?

If you also have the original Order Number, that would be helpful as well.

Once we have the Lot Number, we'll process your CoA request promptly.

Best regards,
Alliance Chemical Support
`.trim();
        }

        // --- ShipStation Automation Step ---
        // Check if AI suggests it AND an order number exists
        if (aiAnalysis?.likelyCustomerRequest &&
            (aiAnalysis.intent === 'order_status_inquiry' || aiAnalysis.intent === 'tracking_request') &&
            aiAnalysis.orderNumber)
        {
            console.log(`EmailProcessor: AI identified intent '${aiAnalysis.intent}' for order ${aiAnalysis.orderNumber}. Checking ShipStation...`);
            automationAttempted = true;
            // getOrderTrackingInfo returns OrderTrackingInfo | null
            automationInfo = await getOrderTrackingInfo(aiAnalysis.orderNumber);

            if (automationInfo) { // Check if the lookup itself didn't critically fail (return null)
                console.log(`EmailProcessor: ShipStation lookup result for ${aiAnalysis.orderNumber}: Found=${automationInfo.found}, Status=${automationInfo.orderStatus}`);
            } else {
                console.error(`EmailProcessor: ShipStation lookup returned null for order ${aiAnalysis.orderNumber}.`);
                // Alert already handled within shipstationService
            }
        }

        // --- Prepare Ticket Data and Internal Note ---
        let internalNoteContent = '';

        // Add explicit check for automationInfo before accessing its properties
        if (automationAttempted && automationInfo) {
            if (automationInfo.found) { // Now TS knows automationInfo is not null here
                internalNoteContent += `**ShipStation Info for Order ${aiAnalysis?.orderNumber}:**\n`;
                internalNoteContent += `Status: ${automationInfo.orderStatus}\n`;
                if (automationInfo.shipments && automationInfo.shipments.length > 0) {
                    internalNoteContent += `Shipments:\n`;
                    // Add type annotation for 'ship' parameter
                    automationInfo.shipments.forEach((ship: { carrier: string; trackingNumber: string; shipDate: string }) => {
                        internalNoteContent += `- Carrier: ${ship.carrier}, Tracking: ${ship.trackingNumber}, Shipped: ${new Date(ship.shipDate).toLocaleDateString()}\n`;
                    });
                } else {
                    internalNoteContent += `Shipments: None found.\n`;
                }
            } else {
                // Access errorMessage only if found is false
                internalNoteContent += `**ShipStation Lookup:** Order ${aiAnalysis?.orderNumber} lookup attempted. ${automationInfo.errorMessage || 'Order not found.'}\n`;
            }
        // Handle case where automation was attempted but lookup failed critically (automationInfo is null)
        } else if (automationAttempted && !automationInfo) {
            internalNoteContent += `**ShipStation Lookup:** Order ${aiAnalysis?.orderNumber} lookup failed critically. Check service logs.\n`;
        }

        // Add draft reply to internal note if available
        if (draftReplyContent) {
            if (internalNoteContent) {
                internalNoteContent += '\n\n---\n\n';
            }
            internalNoteContent += `**Suggested Reply (Request for Lot #):**\n${draftReplyContent}`;
            // Set status only if drafting reply for missing info
            ticketStatus = 'pending_customer' as typeof ticketStatusEnum.enumValues[number];
        }

        const ticketData = {
            title: aiAnalysis?.summary?.substring(0, 255) || subject.substring(0, 255),
            description: body,
            reporterId: reporterId,
            priority: aiAnalysis?.prioritySuggestion || DEFAULT_PRIORITY,
            status: ticketStatus,
            type: (aiAnalysis?.ticketType && ticketTypeEcommerceEnum.enumValues.includes(aiAnalysis.ticketType as any))
                  ? aiAnalysis.ticketType as typeof ticketTypeEcommerceEnum.enumValues[number]
                  : DEFAULT_TYPE,
            orderNumber: aiAnalysis?.orderNumber || null,
            // Check automationInfo before accessing shipments
            trackingNumber: aiAnalysis?.trackingNumber || automationInfo?.shipments?.[0]?.trackingNumber || null,
            senderEmail: senderEmail,
            senderName: senderName,
            externalMessageId: emailMessage.internetMessageId || null,
            conversationId: conversationThreadId || null
        };

        // --- Create Ticket and Internal Note ---
        try {
            const [newTicket] = await db.insert(tickets).values(ticketData).returning({ id: tickets.id });
            const newTicketId = newTicket.id;
            console.log(`EmailProcessor: Created ticket ${newTicketId} for email ${messageId}. AI Used: ${!!aiAnalysis}. ConvID: ${conversationThreadId}`);

            // Add the internal note if we have content
            if (internalNoteContent.trim()) {
                // Update the draft reply with the actual ticket ID if it exists
                const noteContent = draftReplyContent 
                    ? internalNoteContent.replace('(Ticket ID will be generated shortly)', `(Ref: Ticket #${newTicketId})`)
                    : internalNoteContent;

                await db.insert(ticketComments).values({
                    ticketId: newTicketId,
                    commentText: noteContent,
                    commenterId: null, // Indicate system generated
                    isInternalNote: true,
                    isFromCustomer: false,
                });
                console.log(`EmailProcessor: Added internal note with automation info to ticket ${newTicketId}`);
            }

            // Mark Email as Read
            await graphService.markEmailAsRead(messageId);
            console.log(`EmailProcessor: New email ${messageId} marked as read.`);

            // Emit event for the new ticket
            ticketEventEmitter.emit({
                type: 'ticket_created',
                ticketId: newTicketId
            });

            return {
                success: true,
                ticketId: newTicketId,
                message: draftReplyContent 
                    ? "Ticket created. Reply asking for Lot # drafted as internal note."
                    : "Ticket created successfully" + (automationAttempted ? " with automation info." : "."),
                automation_attempted: automationAttempted,
                automation_info: automationInfo || undefined
            };
        } catch (dbError: any) {
            console.error(`EmailProcessor: Database error creating ticket/note for email ${messageId}:`, dbError);
            try { await graphService.markEmailAsRead(messageId); } catch(e){}
            await alertService.trackErrorAndAlert('EmailProcessor-DB', `DB error for email ${messageId}`, dbError);
            throw dbError;
        }

    } catch (error: any) {
        console.error(`EmailProcessor: CRITICAL Error processing email ${messageId || 'unknown'}:`, error);
        if (messageId) { try { await graphService.markEmailAsRead(messageId); } catch (readError: any) { /* ... */ } }
        await alertService.trackErrorAndAlert('EmailProcessor-Critical', `Unhandled error processing email ${messageId || 'unknown'}`, error);
        return { success: false, message: error.message || 'Unknown critical processing error', automation_attempted: automationAttempted };
    }
}

// --- Batch Processing Function (processUnreadEmails) ---
export async function processUnreadEmails(limit = 50): Promise<{
    success: boolean;
    message: string;
    processed: number;
    commentAdded: number;
    errors: number;
    skipped: number;
    automationAttempts: number;
    automationSuccess: number;
    results: ProcessEmailResult[];
}> {
    let processedCount = 0;
    let commentAddedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    let automationAttempts = 0;
    let automationSuccess = 0;
    const results: ProcessEmailResult[] = [];
    const criticalErrors: any[] = [];

    console.log(`EmailProcessor: Starting batch processing of up to ${limit} unread emails.`);

    let unreadEmails: Message[];
    try {
        unreadEmails = await graphService.getUnreadEmails(limit);
    } catch (fetchError: any) {
        console.error("EmailProcessor: Failed to fetch unread emails:", fetchError);
        await alertService.trackErrorAndAlert('EmailProcessor-Fetch', 'Failed to fetch unread emails', fetchError);
        return {
            success: false,
            message: `Failed to fetch emails: ${fetchError.message}`,
            processed: 0,
            commentAdded: 0,
            errors: 1,
            skipped: 0,
            automationAttempts: 0,
            automationSuccess: 0,
            results: []
        };
    }

    if (unreadEmails.length === 0) {
        return {
            success: true,
            message: "No unread emails found.",
            processed: 0,
            commentAdded: 0,
            errors: 0,
            skipped: 0,
            automationAttempts: 0,
            automationSuccess: 0,
            results: []
        };
    }

    console.log(`EmailProcessor: Found ${unreadEmails.length} unread email(s). Processing...`);

    for (const email of unreadEmails) {
        const result = await processSingleEmail(email);
        results.push(result);

        if (result.automation_attempted) {
            automationAttempts++;
            if (result.automation_info?.found) {
                automationSuccess++;
            }
        }

        if (result.success) {
            if (result.skipped) skippedCount++;
            else if (result.commentId) commentAddedCount++;
            else processedCount++;
        } else {
            errorCount++;
            if (!result.skipped) criticalErrors.push({
                messageId: email.id,
                error: result.message
            });
        }
    }

    const summary = `Batch processing complete. New Tickets: ${processedCount}, Comments Added: ${commentAddedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}. Automation: ${automationSuccess}/${automationAttempts} successful lookups.`;
    console.log(`EmailProcessor: ${summary}`);

    if (criticalErrors.length > 0) {
        await alertService.trackErrorAndAlert(
            'EmailProcessor-Batch',
            `Critical errors during batch processing`,
            { errors: criticalErrors }
        );
    }

    return {
        success: errorCount === 0,
        message: summary,
        processed: processedCount,
        commentAdded: commentAddedCount,
        errors: errorCount,
        skipped: skippedCount,
        automationAttempts,
        automationSuccess,
        results
    };
}