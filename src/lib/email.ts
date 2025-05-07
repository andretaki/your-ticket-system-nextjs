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