import { NextResponse } from 'next/server';
import * as graphService from '@/lib/graphService';
import { db } from '@/db';
import { users, tickets, projects, priorityEnum, statusEnum } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Message } from '@microsoft/microsoft-graph-types';

// Configuration (Consider moving to a config file or ENV vars)
const PROCESSED_FOLDER_NAME = "Processed";
const ERROR_FOLDER_NAME = "Error";
const DEFAULT_PROJECT_NAME = "Inbox Triage"; // Project for uncategorized tickets
const DEFAULT_PRIORITY = priorityEnum.enumValues[1]; // 'medium'
const DEFAULT_STATUS = statusEnum.enumValues[0]; // 'open'

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

    try {
        // Check if folders exist, create if not
        try {
            processedFolderId = await graphService.createFolderIfNotExists(PROCESSED_FOLDER_NAME);
            errorFolderId = await graphService.createFolderIfNotExists(ERROR_FOLDER_NAME);
        } catch (folderError) {
            console.error("Failed to create or access required mail folders:", folderError);
            return NextResponse.json({ 
                error: "Failed to access required mail folders. Check your Microsoft Graph permissions." 
            }, { status: 500 });
        }

        // Get the default project for incoming tickets
        defaultProjectId = await getDefaultProjectId();
        if (!defaultProjectId) {
            throw new Error(`Could not find or create the default project "${DEFAULT_PROJECT_NAME}". Cannot process emails.`);
        }

        // --- Fetch Unread Emails ---
        const unreadEmails = await graphService.getUnreadEmails(50); // Process up to 50 at a time

        if (unreadEmails.length === 0) {
            console.log("API: No unread emails to process.");
            return NextResponse.json({ message: "No unread emails found." });
        }

        console.log(`API: Processing ${unreadEmails.length} unread email(s)...`);

        // --- Process Each Email ---
        for (const email of unreadEmails) {
            if (!email.id || !email.sender?.emailAddress?.address || !email.subject) {
                console.warn(`Email processing: Skipping email due to missing ID, sender, or subject. ID: ${email.id}`);
                processingErrors.push(`Skipped email ID ${email.id}: Missing essential info.`);
                errorCount++;
                // Optionally move to error folder even if skipped
                if (errorFolderId && email.id) await graphService.moveEmail(email.id, errorFolderId);
                continue;
            }

            const messageId = email.id;
            const senderEmail = email.sender.emailAddress.address;
            const senderName = email.sender.emailAddress.name;
            const subject = email.subject;
            // Prefer text body, fallback to HTML body (needs sanitization if rendered)
            const description = email.body?.contentType === 'text' ? email.body.content : email.bodyPreview;

            if (!description) {
                console.warn(`Email processing: Skipping email ID ${messageId} due to missing body content.`);
                processingErrors.push(`Skipped email ID ${messageId}: Missing body content.`);
                errorCount++;
                if (errorFolderId) await graphService.moveEmail(messageId, errorFolderId);
                continue;
            }

            try {
                 // --- Find or Create Reporter ---
                const reporterId = await findOrCreateUser(senderEmail, senderName);
                if (!reporterId) {
                    throw new Error(`Failed to find or create user for ${senderEmail}`);
                }

                // Check if this email has already been processed (by messageId)
                if (email.internetMessageId) {
                    const existingTicket = await db.query.tickets.findFirst({
                        where: eq(tickets.externalMessageId, email.internetMessageId),
                        columns: { id: true }
                    });
                    
                    if (existingTicket) {
                        console.log(`Email processing: Skipping already processed email with ID ${email.internetMessageId}`);
                        // Mark as read and move to processed folder
                        await graphService.markEmailAsRead(messageId);
                        await graphService.moveEmail(messageId, processedFolderId);
                        processedCount++;
                        continue;
                    }
                }

                // --- Create Ticket in DB ---
                // TODO: Add logic here to parse subject/body for project, priority, type if needed
                // For now, use defaults.
                const [newTicket] = await db.insert(tickets).values({
                    title: subject.substring(0, 255), // Ensure title fits
                    description: description,
                    projectId: defaultProjectId, // Use the default project ID
                    reporterId: reporterId,
                    priority: DEFAULT_PRIORITY,
                    status: DEFAULT_STATUS,
                    // Store email-specific identifiers
                    senderEmail: senderEmail,
                    senderName: senderName,
                    externalMessageId: email.internetMessageId, // Important for preventing duplicates if re-processed
                }).returning({ id: tickets.id });

                console.log(`Email processing: Created ticket ${newTicket.id} for email ${messageId}.`);

                // --- Mark Email as Read and Move ---
                await graphService.markEmailAsRead(messageId);
                await graphService.moveEmail(messageId, processedFolderId); // Move to Processed folder
                processedCount++;

            } catch (dbError: any) {
                console.error(`Email processing: Error processing email ${messageId} (Subject: ${subject}):`, dbError);
                processingErrors.push(`Failed email ID ${messageId}: ${dbError.message}`);
                errorCount++;
                // Move to Error folder if DB operation failed
                if (errorFolderId) {
                    await graphService.moveEmail(messageId, errorFolderId);
                     // Mark as read even if moved to error? Optional.
                    await graphService.markEmailAsRead(messageId);
                }
            }
        } // End email loop

        const summary = `Email processing complete. Processed: ${processedCount}, Errors: ${errorCount}.`;
        console.log(`API: ${summary}`);
        return NextResponse.json({
            message: summary,
            processed: processedCount,
            errors: errorCount,
            errorDetails: processingErrors, // Include details about specific errors
        });

    } catch (error: any) {
        console.error("API Error [POST /api/process-emails]: Fatal error during processing -", error);
        return NextResponse.json({ error: `Failed to process emails: ${error.message}` }, { status: 500 });
    }
} 