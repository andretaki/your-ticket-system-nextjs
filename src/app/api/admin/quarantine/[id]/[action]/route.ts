import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/db';
import { quarantinedEmails, tickets, ticketComments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { processSingleEmail } from '@/lib/emailProcessor';

export async function POST(
  request: Request,
  { params }: { params: { id: string; action: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id, action } = params;
    const { reviewNotes, targetTicketId } = await request.json();

    // Fetch the quarantined email
    const email = await db.query.quarantinedEmails.findFirst({
      where: eq(quarantinedEmails.id, parseInt(id)),
    });

    if (!email) {
      return new NextResponse('Email not found', { status: 404 });
    }

    // Update the email status and reviewer info
    const updateData = {
      status: action.replace('-', '_') as any, // Convert 'approve-ticket' to 'approve_ticket'
      reviewerId: session.user.id,
      reviewedAt: new Date(),
      reviewNotes,
    };

    switch (action) {
      case 'approve-ticket':
        // Process the email as a new ticket
        const result = await processSingleEmail({
          messageId: email.originalGraphMessageId,
          internetMessageId: email.internetMessageId,
          subject: email.subject,
          body: email.bodyPreview, // Note: We might want to fetch the full body here
          senderEmail: email.senderEmail,
          senderName: email.senderName,
        });

        if (!result.success) {
          return new NextResponse('Failed to create ticket', { status: 500 });
        }

        await db.update(quarantinedEmails)
          .set(updateData)
          .where(eq(quarantinedEmails.id, parseInt(id)));

        return NextResponse.json({ success: true, message: 'Ticket created successfully' });

      case 'approve-comment':
        if (!targetTicketId) {
          return new NextResponse('Target ticket ID is required', { status: 400 });
        }

        // Verify the target ticket exists
        const ticket = await db.query.tickets.findFirst({
          where: eq(tickets.id, parseInt(targetTicketId)),
        });

        if (!ticket) {
          return new NextResponse('Target ticket not found', { status: 404 });
        }

        // Add the email as a comment
        await db.insert(ticketComments).values({
          ticketId: parseInt(targetTicketId),
          commentText: email.bodyPreview,
          commenterId: session.user.id,
          isFromCustomer: true,
          isInternalNote: false,
          isOutgoingReply: false,
        });

        await db.update(quarantinedEmails)
          .set(updateData)
          .where(eq(quarantinedEmails.id, parseInt(id)));

        return NextResponse.json({ success: true, message: 'Comment added successfully' });

      case 'reject-spam':
      case 'reject-vendor':
      case 'delete':
        await db.update(quarantinedEmails)
          .set(updateData)
          .where(eq(quarantinedEmails.id, parseInt(id)));

        return NextResponse.json({ success: true, message: 'Email status updated successfully' });

      default:
        return new NextResponse('Invalid action', { status: 400 });
    }
  } catch (error) {
    console.error('Error processing quarantine action:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 