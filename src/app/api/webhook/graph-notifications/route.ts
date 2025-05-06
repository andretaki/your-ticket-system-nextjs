import { NextResponse, NextRequest } from 'next/server';
import * as graphService from '@/lib/graphService';
import { db } from '@/db';
import { tickets, users, ticketPriorityEnum, ticketStatusEnum, ticketTypeEcommerceEnum } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { analyzeEmailContent } from '@/lib/aiService';

// Constants from your process-emails route (or a shared config)
const PROCESSED_FOLDER_NAME = process.env.PROCESSED_FOLDER_NAME || "Processed";
const ERROR_FOLDER_NAME = process.env.ERROR_FOLDER_NAME || "Error";
const INTERNAL_DOMAIN = "alliancechemical.com"; // Or from ENV
const DEFAULT_PRIORITY = ticketPriorityEnum.enumValues[1]; // 'medium'
const DEFAULT_STATUS = ticketStatusEnum.enumValues[0]; // 'new'
const DEFAULT_TYPE = 'General Inquiry' as typeof ticketTypeEcommerceEnum.enumValues[number];

// Helper function to find or create a user based on email
async function findOrCreateUserWebhook(senderEmail: string, senderName?: string | null): Promise<number | null> {
    if (!senderEmail) return null;
    
    try {
        let user = await db.query.users.findFirst({ 
            where: eq(users.email, senderEmail), 
            columns: { id: true }
        });
        
        if (user) return user.id;
        
        const [newUser] = await db.insert(users).values({
            email: senderEmail, 
            name: senderName || senderEmail.split('@')[0], 
            password: null,
            role: 'user', 
            isExternal: true,
        }).returning({ id: users.id });
        
        return newUser.id;
    } catch (error) {
        console.error(`Webhook: Error finding or creating user for ${senderEmail}:`, error);
        return null;
    }
}

// Helper function to create a ticket from an email
async function createTicketFromEmail(email: any, reporterId: number) {
    try {
        const subject = email.subject || "No Subject";
        const body = email.body?.contentType === 'text' 
            ? email.body.content 
            : email.bodyPreview || '';

        let aiAnalysis = null;
        
        try {
            aiAnalysis = await analyzeEmailContent(subject, body);
        } catch (aiError) {
            console.error(`Webhook: AI Analysis Error for email ${email.id}:`, aiError);
            // Continue with default values if AI analysis fails
        }

        const ticketData = {
            title: aiAnalysis?.summary?.substring(0, 255) || subject.substring(0, 255),
            description: body,
            reporterId,
            priority: aiAnalysis?.prioritySuggestion || DEFAULT_PRIORITY,
            status: DEFAULT_STATUS,
            type: (aiAnalysis?.ticketType && ticketTypeEcommerceEnum.enumValues.includes(aiAnalysis.ticketType as any))
                  ? aiAnalysis.ticketType as typeof ticketTypeEcommerceEnum.enumValues[number]
                  : DEFAULT_TYPE,
            orderNumber: aiAnalysis?.orderNumber || null,
            trackingNumber: aiAnalysis?.trackingNumber || null,
            senderEmail: email.sender?.emailAddress?.address,
            senderName: email.sender?.emailAddress?.name,
            externalMessageId: email.internetMessageId,
        };

        const [newTicket] = await db.insert(tickets).values(ticketData).returning({ id: tickets.id });
        console.log(`Webhook: Created ticket ${newTicket.id} for email ${email.id}. AI Used: ${!!aiAnalysis}`);
        return newTicket;
    } catch (error) {
        console.error(`Webhook: Error creating ticket for email ${email.id}:`, error);
        throw error;
    }
}

export async function POST(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const validationToken = searchParams.get('validationToken');

    // 1. Handle Subscription Validation Request
    if (validationToken) {
        console.log('Webhook: Received validation token:', validationToken);
        return new NextResponse(validationToken, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
        });
    }

    // 2. Handle Actual Notifications
    try {
        const notificationPayload = await request.json();
        console.log('Webhook: Received notification:', JSON.stringify(notificationPayload));

        if (notificationPayload && notificationPayload.value && notificationPayload.value.length > 0) {
            for (const notification of notificationPayload.value) {
                // Verify clientState if you set one during subscription
                if (process.env.MICROSOFT_GRAPH_WEBHOOK_SECRET && 
                    notification.clientState !== process.env.MICROSOFT_GRAPH_WEBHOOK_SECRET) {
                    console.warn('Webhook: Invalid clientState. Ignoring notification.');
                    continue;
                }

                if (notification.resource && notification.changeType === 'created') {
                    const messageId = notification.resourceData.id;
                    console.log(`Webhook: New email created - ID: ${messageId}`);

                    // Fetch the full message details
                    const emailMessage = await graphService.getMessageById(messageId);

                    if (emailMessage) {
                        const senderEmail = emailMessage.sender?.emailAddress?.address;
                        
                        // Skip internal emails
                        if (senderEmail && senderEmail.endsWith(`@${INTERNAL_DOMAIN}`)) {
                            console.log(`Webhook: Skipping email from internal domain: ${senderEmail}`);
                            await graphService.markEmailAsRead(messageId);
                            const processedFolderId = await graphService.createFolderIfNotExists(PROCESSED_FOLDER_NAME);
                            if (processedFolderId) {
                                await graphService.moveEmail(messageId, processedFolderId);
                            }
                            continue;
                        }

                        const reporterId = await findOrCreateUserWebhook(
                            senderEmail || "", 
                            emailMessage.sender?.emailAddress?.name
                        );
                        
                        if (reporterId) {
                            // Check for duplicates before creating
                            if (emailMessage.internetMessageId) {
                                const existingTicket = await db.query.tickets.findFirst({
                                    where: eq(tickets.externalMessageId, emailMessage.internetMessageId),
                                    columns: { id: true }
                                });
                                
                                if (existingTicket) {
                                    console.log(`Webhook: Ticket already exists for internetMessageId: ${emailMessage.internetMessageId}. Skipping.`);
                                    await graphService.markEmailAsRead(messageId);
                                    const processedFolderId = await graphService.createFolderIfNotExists(PROCESSED_FOLDER_NAME);
                                    if (processedFolderId) {
                                        await graphService.moveEmail(messageId, processedFolderId);
                                    }
                                    continue;
                                }
                            }
                            
                            await createTicketFromEmail(emailMessage, reporterId);
                            await graphService.markEmailAsRead(messageId);
                            const processedFolderId = await graphService.createFolderIfNotExists(PROCESSED_FOLDER_NAME);
                            if (processedFolderId) {
                                await graphService.moveEmail(messageId, processedFolderId);
                            }
                        } else {
                            console.error(`Webhook: Could not find or create user for sender: ${senderEmail}`);
                            // Move to error folder
                            const errorFolderId = await graphService.createFolderIfNotExists(ERROR_FOLDER_NAME);
                            if (errorFolderId) {
                                await graphService.moveEmail(messageId, errorFolderId);
                                await graphService.markEmailAsRead(messageId);
                            }
                        }
                    } else {
                        console.error(`Webhook: Could not fetch details for message ID: ${messageId}`);
                    }
                }
            }
        }
        
        // Always return a 202 Accepted for notifications to prevent Graph from resending
        return NextResponse.json({ message: 'Notification received and processed' }, { status: 202 });
    } catch (error) {
        console.error('Webhook: Error processing notification:', error);
        // Return 202 even on error to avoid Graph retries for this specific notification,
        // but log thoroughly. Persistent errors need investigation.
        return NextResponse.json({ message: 'Error processing notification but accepted' }, { status: 202 });
    }
} 