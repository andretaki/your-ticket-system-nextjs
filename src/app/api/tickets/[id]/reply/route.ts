import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { ticketComments, tickets, users, ticketAttachments } from '@/db/schema';
import { and, eq, or, isNull } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { sendTicketReplyEmail } from '@/lib/email'; // Import your email sending function

// Type for the request body
interface ReplyRequestBody {
  content: string;
  isInternalNote?: boolean;
  sendAsEmail?: boolean;
  attachmentIds?: number[]; // New field for attachments
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Ensure the user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get the current user
    const currentUser = await db.query.users.findFirst({
      where: eq(users.email, session.user.email),
    });

    if (!currentUser) {
      return new NextResponse('User not found', { status: 404 });
    }

    const ticketId = parseInt(params.id);
    if (isNaN(ticketId)) {
      return new NextResponse('Invalid ticket ID', { status: 400 });
    }

    // Verify the ticket exists
    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, ticketId),
      with: {
        assignee: true,
        reporter: true,
      },
    });

    if (!ticket) {
      return new NextResponse('Ticket not found', { status: 404 });
    }

    // Parse the request body
    const requestBody = await request.json() as ReplyRequestBody;
    
    // Check if content is provided when not attaching files
    if (!requestBody.content && (!requestBody.attachmentIds || requestBody.attachmentIds.length === 0)) {
      return new NextResponse('Comment content is required if no attachments', { status: 400 });
    }

    // Set up comment data
    const commentData = {
      ticketId,
      commentText: requestBody.content || '(Attachments only)',
      commenterId: currentUser.id,
      isInternalNote: requestBody.isInternalNote || false,
      isOutgoingReply: requestBody.sendAsEmail || false,
    };

    // Insert comment
    const [newComment] = await db.insert(ticketComments)
      .values(commentData)
      .returning();

    // If there are attachments, associate them with this comment
    if (requestBody.attachmentIds && requestBody.attachmentIds.length > 0) {
      // Update attachments to be associated with this comment
      await db.update(ticketAttachments)
        .set({ commentId: newComment.id })
        .where(
          and(
            eq(ticketAttachments.ticketId, ticketId),
            or(
              ...requestBody.attachmentIds.map(id => eq(ticketAttachments.id, id))
            )
          )
        );
      
      // Fetch the updated attachments to return
      const updatedAttachments = await db.query.ticketAttachments.findMany({
        where: eq(ticketAttachments.commentId, newComment.id),
      });

      // Enhance the response with attachment data
      newComment.attachments = updatedAttachments;
    }

    // If this is an email reply, send it
    if (requestBody.sendAsEmail && ticket.senderEmail) {
      try {
        await sendTicketReplyEmail({
          ticketId: ticket.id,
          recipientEmail: ticket.senderEmail,
          recipientName: ticket.senderName || 'Customer',
          subject: `Re: ${ticket.title}`,
          message: requestBody.content,
          senderName: currentUser.name || 'Support Team',
          // Pass attachments if any
          attachments: requestBody.attachmentIds?.length 
            ? await db.query.ticketAttachments.findMany({
                where: and(
                  eq(ticketAttachments.commentId, newComment.id),
                  or(...requestBody.attachmentIds.map(id => eq(ticketAttachments.id, id)))
                ),
              })
            : []
        });
        
        // Update the ticket status to "pending_customer" if it's not already closed
        if (ticket.status !== 'closed') {
          await db.update(tickets)
            .set({ 
              status: 'pending_customer',
              updatedAt: new Date()
            })
            .where(eq(tickets.id, ticketId));
        }
      } catch (emailError) {
        console.error('Failed to send email reply:', emailError);
        // We still created the comment, so don't return an error response
        // Just add a message to the response
        return NextResponse.json({ 
          ...newComment, 
          warning: 'Comment saved but email delivery failed'
        });
      }
    }

    return NextResponse.json(newComment);
  } catch (error) {
    console.error('Error creating reply:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 