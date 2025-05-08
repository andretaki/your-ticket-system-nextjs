import * as graphService from '@/lib/graphService';
import { Message } from '@microsoft/microsoft-graph-types';
import { ticketAttachments } from '@/db/schema';
import { InferSelectModel } from 'drizzle-orm';

// Define the type based on the schema
type TicketAttachment = InferSelectModel<typeof ticketAttachments>;

interface TicketReplyEmailOptions {
  ticketId: number;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  message: string; // This should contain the HTML formatted message
  senderName: string;
  attachments?: TicketAttachment[];
  inReplyToId?: string;    // internetMessageId of the message being replied to
  referencesIds?: string[]; // List of internetMessageIds for the References header
  conversationId?: string; // Conversation ID from the thread
}

/**
 * Sends a reply email for a ticket, attempting to thread it correctly.
 * @param options The email options including threading info
 * @returns The sent message object or null if sending fails
 */
export async function sendTicketReplyEmail(options: TicketReplyEmailOptions): Promise<Message | null> {
  try {
    const {
      ticketId,
      recipientEmail, 
      recipientName, 
      subject, 
      message,
      senderName,
      attachments = [],
      inReplyToId,
      referencesIds,
      conversationId
    } = options;

    // Create message object for threading
    // Use provided threading info if available, otherwise create dummy info
    const originalMessage: Message = {
      id: inReplyToId ? `msg-${inReplyToId}` : `ticket-${ticketId}-${Date.now()}`,
      internetMessageId: inReplyToId || `ticket-${ticketId}-${Date.now()}@ticket-system.local`,
      conversationId: conversationId || `ticket-${ticketId}`
    };

    // If we have references, add them as internetMessageHeaders
    if (referencesIds && referencesIds.length > 0) {
      originalMessage.internetMessageHeaders = [{
        name: 'References',
        value: referencesIds.join(' ')
      }];
    }

    // Simplified HTML structure
    const htmlBody = `
      <div style="font-family: sans-serif; font-size: 14px;">
        <p>Hello ${recipientName},</p>
        ${message}
        <br>
        <p>Regards,<br>${senderName}</p>
        <hr style="border: none; border-top: 1px solid #ccc;">
        <p style="color: #666666; font-size: 12px;">
          This is regarding ticket #${ticketId}. Please reply to this email to continue the conversation.
        </p>
      </div>
    `;

    // Send the email using graphService
    return await graphService.sendEmailReply(
      recipientEmail,
      subject,
      htmlBody,
      originalMessage
    );
  } catch (error) {
    console.error('Email Service: Error sending ticket reply email:', error);
    throw error;
  }
} 

/**
 * Options for sending a notification email (not a reply, no threading).
 */
interface NotificationEmailOptions {
  recipientEmail: string;
  recipientName?: string; // Optional recipient name
  subject: string;
  htmlBody: string; // Expect pre-formatted HTML
  senderName?: string; // Optional sender name display
}

/**
 * Sends a generic notification email (NOT a reply, no threading).
 * @param options The email options.
 * @returns True if sending was initiated successfully, false otherwise.
 */
export async function sendNotificationEmail(options: NotificationEmailOptions): Promise<boolean> {
  try {
    const {
      recipientEmail,
      recipientName = 'User', // Default name if not provided
      subject,
      htmlBody,
      senderName = 'Ticket System' // Default sender name
    } = options;

    // Prepare the email content with a simple wrapper
    const formattedHtml = `
      <div style="font-family: sans-serif; font-size: 14px;">
        ${htmlBody}
        <p>Regards,<br>${senderName}</p>
      </div>
    `;

    // Use the existing sendEmailReply function, but without threading information
    const result = await graphService.sendEmailReply(
      recipientEmail,
      subject,
      formattedHtml,
      {} // Empty object for no threading info
    );

    console.log(`NotificationService: Notification email sent successfully to ${recipientEmail}.`);
    return result !== null;

  } catch (error) {
    console.error('NotificationService: Error sending notification email:', error);
    return false; // Indicate failure
  }
} 