import { NextResponse } from 'next/server';
import * as graphService from '@/lib/graphService';
import { db } from '@/db';
import { users, tickets, projects, ticketPriorityEnum, ticketStatusEnum, ticketTypeEcommerceEnum } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Message } from '@microsoft/microsoft-graph-types';
import { analyzeEmailContent } from '@/lib/aiService'; // Import the AI service

// Configuration (Consider moving to a config file or ENV vars)
const PROCESSED_FOLDER_NAME = process.env.PROCESSED_FOLDER_NAME || "Processed";
const ERROR_FOLDER_NAME = process.env.ERROR_FOLDER_NAME || "Error";
const DEFAULT_PROJECT_NAME = process.env.DEFAULT_PROJECT_NAME || "Inbox Triage"; // Project for uncategorized tickets
const DEFAULT_PRIORITY = ticketPriorityEnum.enumValues[1]; // 'medium'
const DEFAULT_STATUS = ticketStatusEnum.enumValues[0]; // 'new'
const DEFAULT_TYPE = 'General Inquiry' as typeof ticketTypeEcommerceEnum.enumValues[number];

// Helper to find or create a user based on email
async function findOrCreateUser(senderEmail: string, senderName?: string | null): Promise<number | null> {
    if (!senderEmail) {
        console.warn("Email processing: Sender email missing.");
        return null; // Cannot create a user without an email
    }

    try {
        let user = await db.query.users.findFirst({
            where: eq(users.email, senderEmail),
            columns: { id: true }
        });

        if (user) {
            return user.id;
        } else {
            // User doesn't exist, create a basic user record
            console.log(`Email processing: Creating new user for ${senderEmail}`);
            // Use a secure default password or a flag indicating external creation
            const placeholderPassword = "password_placeholder_" + Date.now(); // NOT FOR PRODUCTION LOGIN
            const [newUser] = await db.insert(users).values({
                email: senderEmail,
                name: senderName || senderEmail.split('@')[0], // Use name part of email if no name provided
                password: placeholderPassword, // Needs hashing in a real app
                role: 'user', // Or a specific role for email reporters
            }).returning({ id: users.id });
            return newUser.id;
        }
    } catch (error) {
        console.error(`Email processing: Error finding or creating user for ${senderEmail}:`, error);
        return null; // Return null if user creation/lookup fails
    }
}

// Helper to find the default project ID
async function getDefaultProjectId(): Promise<number | null> {
     try {
        const project = await db.query.projects.findFirst({
            where: eq(projects.name, DEFAULT_PROJECT_NAME),
            columns: { id: true }
        });
        if (!project) {
            // Optionally create the default project if it doesn't exist
            console.warn(`Email processing: Default project "${DEFAULT_PROJECT_NAME}" not found. Creating...`);
            const [newProject] = await db.insert(projects).values({ 
                name: DEFAULT_PROJECT_NAME, 
                description: "Default project for tickets created from email." 
            }).returning({ id: projects.id });
            return newProject.id;
        }
        return project.id;
    } catch (error) {
        console.error(`Email processing: Error finding/creating default project:`, error);
        return null;
    }
}

// --- POST Endpoint to Trigger Processing ---
// NOTE: In production, this should ideally be a secure endpoint or a scheduled task, not a public POST.
export async function POST(request: Request) {
    console.log("API: Starting email processing...");
    let processedCount = 0;
    let errorCount = 0;
    const processingErrors: string[] = [];

    let processedFolderId: string | null = null;
    let errorFolderId: string | null = null;
    let defaultProjectId: number | null = null;

    // --- Pre-computation: Folder IDs and Default Project ID ---
    try {
        processedFolderId = await graphService.createFolderIfNotExists(PROCESSED_FOLDER_NAME);
        errorFolderId = await graphService.createFolderIfNotExists(ERROR_FOLDER_NAME);
        defaultProjectId = await getDefaultProjectId();
        if (!defaultProjectId) {
            throw new Error(`Could not find or create the default project "${DEFAULT_PROJECT_NAME}".`);
        }
    } catch (setupError: any) {
        console.error("API Error: Failed during setup (folders/project):", setupError);
        return NextResponse.json({ error: `Setup failed: ${setupError.message}` }, { status: 500 });
    }

    // --- Fetch Unread Emails ---
    let unreadEmails;
    try {
        unreadEmails = await graphService.getUnreadEmails(50); // Process up to 50
        if (unreadEmails.length === 0) {
            console.log("API: No unread emails to process.");
            return NextResponse.json({ message: "No unread emails found." });
        }
        console.log(`API: Found ${unreadEmails.length} unread email(s). Starting processing...`);
    } catch (fetchError: any) {
        console.error("API Error: Failed to fetch unread emails:", fetchError);
        return NextResponse.json({ error: `Failed to fetch emails: ${fetchError.message}` }, { status: 500 });
    }

    // --- Process Each Email ---
    for (const email of unreadEmails) {
        const messageId = email.id; // Get ID early for logging/error handling

        try {
            // --- Basic Email Validation ---
            if (!messageId || !email.sender?.emailAddress?.address || !email.subject || !email.bodyPreview) { // Use bodyPreview as fallback text
                 console.warn(`Email processing: Skipping email ID ${messageId || 'unknown'} due to missing essential info.`);
                 processingErrors.push(`Skipped email ID ${messageId || 'unknown'}: Missing essential info (ID, sender, subject, or body preview).`);
                 errorCount++;
                 if (messageId && errorFolderId) {
                    await graphService.moveEmail(messageId, errorFolderId);
                    await graphService.markEmailAsRead(messageId); // Mark as read even if moved to error
                 }
                 continue; // Skip to next email
            }

            const senderEmail = email.sender.emailAddress.address;
            const senderName = email.sender.emailAddress.name;
            const subject = email.subject;
            // Prefer plain text body if available, otherwise use HTML body (strip tags if possible later) or preview
            const emailBody = email.body?.contentType === 'text'
                ? email.body.content ?? email.bodyPreview ?? ''
                : email.bodyPreview ?? ''; // Fallback to preview if content missing or HTML

            // --- Find or Create Reporter ---
            const reporterId = await findOrCreateUser(senderEmail, senderName);
            if (!reporterId) {
                 throw new Error(`Failed to find or create user for ${senderEmail}`); // Throw to catch block
            }

             // --- Check for Duplicates ---
            if (email.internetMessageId) {
                const existingTicket = await db.query.tickets.findFirst({
                    where: eq(tickets.externalMessageId, email.internetMessageId),
                    columns: { id: true }
                });
                if (existingTicket) {
                    console.log(`Email processing: Skipping already processed email (internetMessageId: ${email.internetMessageId})`);
                    await graphService.markEmailAsRead(messageId);
                    if (processedFolderId) await graphService.moveEmail(messageId, processedFolderId);
                    // Don't count as processed again if it was already processed
                    continue; // Skip to next email
                }
            }

            // --- AI Analysis ---
            let aiAnalysis = null;
            let ticketData;

            try {
                aiAnalysis = await analyzeEmailContent(subject, emailBody);
            } catch (aiError: any) {
                console.error(`AI Analysis Error for email ${messageId}:`, aiError);
                processingErrors.push(`AI analysis failed for email ID ${messageId}. Using defaults.`);
                // Don't increment errorCount here, as we'll still try to process with defaults
            }

            // --- Prepare Ticket Data (using AI results or defaults) ---
            ticketData = {
                title: aiAnalysis?.summary?.substring(0, 255) || subject.substring(0, 255), // Use AI summary or fallback to subject
                description: emailBody, // Use the extracted body
                projectId: defaultProjectId,
                reporterId: reporterId,
                priority: aiAnalysis?.prioritySuggestion || DEFAULT_PRIORITY, // Use AI suggestion or default
                status: DEFAULT_STATUS,
                type: (aiAnalysis?.ticketType && ticketTypeEcommerceEnum.enumValues.includes(aiAnalysis.ticketType as any))
                      ? aiAnalysis.ticketType as typeof ticketTypeEcommerceEnum.enumValues[number]
                      : DEFAULT_TYPE, // Use AI type or default
                orderNumber: aiAnalysis?.orderNumber || null, // Use AI extracted or null
                trackingNumber: aiAnalysis?.trackingNumber || null, // Use AI extracted or null
                senderEmail: senderEmail,
                senderName: senderName,
                externalMessageId: email.internetMessageId, // For duplicate checking
                // assigneeId will be null unless parsed or set by rules later
            };

            // --- Create Ticket in DB ---
            const [newTicket] = await db.insert(tickets).values(ticketData).returning({ id: tickets.id });
            console.log(`Email processing: Created ticket ${newTicket.id} for email ${messageId}. AI Used: ${!!aiAnalysis}`);

            // --- Mark Email as Read and Move ---
            await graphService.markEmailAsRead(messageId);
            if (processedFolderId) await graphService.moveEmail(messageId, processedFolderId); // Move to Processed
            processedCount++;

        } catch (error: any) { // Catch errors specific to processing this *single* email
            console.error(`Email processing: Error processing email ${messageId || 'unknown'}:`, error);
            processingErrors.push(`Failed email ID ${messageId || 'unknown'}: ${error.message}`);
            errorCount++;
            // Attempt to move to Error folder if DB operation or user creation failed
            if (messageId && errorFolderId) {
                 try {
                    await graphService.moveEmail(messageId, errorFolderId);
                    await graphService.markEmailAsRead(messageId); // Mark as read after moving
                 } catch (moveError: any) {
                    console.error(`Email processing: Failed to move email ${messageId} to error folder:`, moveError);
                    processingErrors.push(`Failed to move email ID ${messageId} to error folder after initial error.`);
                 }
            }
        } // End single email try-catch
    } // End email loop

    const summary = `Email processing complete. Processed: ${processedCount}, Errors/Skipped: ${errorCount}.`;
    console.log(`API: ${summary}`);
    return NextResponse.json({
        message: summary,
        processed: processedCount,
        errors: errorCount,
        errorDetails: processingErrors,
    });
} 