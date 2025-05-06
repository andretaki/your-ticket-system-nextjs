import { NextResponse } from 'next/server';
import { db } from '@/db';
import { tickets, ticketComments, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import * as graphService from '@/lib/graphService';
import { getServerSession } from "next-auth/next"; // Import getServerSession
import { authOptions } from '@/lib/authOptions';   // Import your authOptions

const replySchema = z.object({
  content: z.string().min(1, { message: "Reply content cannot be empty." }),
  isInternalNote: z.boolean().optional().default(false),
  sendAsEmail: z.boolean().optional().default(false), // New flag
});

// Helper to parse and validate ticket ID
const getTicketId = async (params: { id: string }) => {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);
  if (isNaN(id)) {
    throw new Error('Invalid ticket ID');
  }
  return id;
};

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // --- Authentication Check ---
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to reply.' }, { status: 401 });
    }
    // --- End Authentication Check ---
    
    const ticketId = await getTicketId(params);
    const commenterId = session.user.id; // Use authenticated user's ID

    const body = await request.json();
    const validationResult = replySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: "Invalid input", details: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const { content, isInternalNote, sendAsEmail } = validationResult.data;

    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, ticketId),
      // Select fields needed for reply and original message context
      columns: { 
        id: true, 
        title: true, 
        senderEmail: true, 
        externalMessageId: true // This should be the internetMessageId of the original email
      } 
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    let emailSentSuccessfully = false;
    if (sendAsEmail && !isInternalNote) {
      if (!ticket.senderEmail) {
        return NextResponse.json({ error: 'Cannot send email reply: Original sender email not found for this ticket.' }, { status: 400 });
      }
      if (!ticket.externalMessageId) {
        console.warn(`API Warning: Attempting to reply to ticket ${ticket.id} without an externalMessageId (for threading). Email might not thread correctly.`);
        // Proceed with sending, but it might not thread
      }

      const replySubject = `Re: [Ticket #${ticket.id}] ${ticket.title}`;
      // For constructing the original message context for graphService.sendEmailReply
      const originalMessageContext = {
        id: ticket.externalMessageId || undefined, // Use externalMessageId if available, else it's a new thread.
        internetMessageId: ticket.externalMessageId || undefined,
        // We don't have full original message headers here, but internetMessageId is key for In-Reply-To
        // and graphService will handle constructing References if possible.
      };
      
      const sentMessage = await graphService.sendEmailReply(
        ticket.senderEmail,
        replySubject,
        content.replace(/\n/g, '<br>'), // Basic HTML conversion for line breaks
        originalMessageContext,
        process.env.MICROSOFT_GRAPH_USER_EMAIL // Ensure sending from the shared mailbox
      );

      if (sentMessage) {
        emailSentSuccessfully = true;
        console.log(`API Info: Email reply sent for ticket ${ticket.id}`);
      } else {
        console.error(`API Error: Failed to send email reply for ticket ${ticket.id}. Comment will be internal.`);
        // Optionally, force the comment to be internal if email sending fails
        // isInternalNote = true; // Or return an error to the user
        return NextResponse.json({ error: 'Failed to send email reply. Comment saved as internal note if possible, or try again.' }, { status: 500 });
      }
    }

    // Save the comment to the database
    const [newDbComment] = await db.insert(ticketComments).values({
      ticketId,
      commenterId,
      commentText: content,
      isInternalNote,
      isFromCustomer: false, // Replies from agents are not "from customer"
      isOutgoingReply: sendAsEmail && emailSentSuccessfully, // Mark if it was an outgoing email
    }).returning();

    // Update the ticket's updatedAt timestamp
    await db.update(tickets)
      .set({ updatedAt: new Date() })
      .where(eq(tickets.id, ticketId));
    
    // Fetch the full comment with commenter details for the response
    const commentWithDetails = await db.query.ticketComments.findFirst({
        where: eq(ticketComments.id, newDbComment.id),
        with: {
            commenter: { columns: { id: true, name: true, email: true } }
        }
    });

    return NextResponse.json({ 
      message: `Comment added. ${sendAsEmail && emailSentSuccessfully ? 'Email reply sent.' : (sendAsEmail ? 'Email reply failed to send.' : '')}`,
      comment: commentWithDetails 
    }, { status: 201 });

  } catch (error) {
    console.error(`API Error [POST /api/tickets/${params.id}/reply]:`, error);
    if (error instanceof Error && error.message === 'Invalid ticket ID') {
      return NextResponse.json({ error: 'Invalid ticket ID format' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to process reply.' }, { status: 500 });
  }
} 