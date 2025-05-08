import { NextResponse } from 'next/server';
import { db } from '@/db';
import { tickets, users, ticketPriorityEnum, ticketStatusEnum, ticketSentimentEnum } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { sendTicketReplyEmail, sendNotificationEmail } from '@/lib/email';

// --- Zod Schema for Validation ---
const updateTicketSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }).max(255).optional(),
  description: z.string().min(1, { message: "Description is required" }).optional(),
  status: z.enum(ticketStatusEnum.enumValues).optional(),
  priority: z.enum(ticketPriorityEnum.enumValues).optional(),
  assigneeEmail: z.string().email().nullable().optional(), // Optional assignee by email
  assigneeId: z.string().nullable().optional(), // Optional assignee by ID
  sentiment: z.enum(ticketSentimentEnum.enumValues).nullable().optional(), // Optional sentiment
  ai_summary: z.string().nullable().optional(), // Optional AI summary
  ai_suggested_assignee_id: z.string().nullable().optional(), // Optional AI suggested assignee
});

// Helper to parse and validate ticket ID
const getTicketId = async (params: { id: string }) => {
  const { id } = await params;
  const ticketId = parseInt(id);
  if (isNaN(ticketId)) {
    throw new Error('Invalid ticket ID');
  }
  return ticketId;
};

// --- GET: Fetch a single ticket with detailed information ---
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Parse and validate ID
    const ticketId = await getTicketId(params);

    // Fetch the ticket with relations
    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, ticketId),
      with: {
        assignee: {
          columns: {
            id: true,
            name: true,
            email: true
          }
        },
        reporter: {
          columns: {
            id: true,
            name: true,
            email: true
          }
        },
        aiSuggestedAssignee: {
          columns: {
            id: true,
            name: true,
            email: true
          }
        },
        comments: {
          with: {
            commenter: {
              columns: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: (comments, { asc }) => [asc(comments.createdAt)]
        }
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error(`API Error [GET /api/tickets/${params.id}]:`, error);
    
    // Handle specific error types
    if (error instanceof Error && error.message === 'Invalid ticket ID') {
      return NextResponse.json({ error: 'Invalid ticket ID format' }, { status: 400 });
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch ticket' }, 
      { status: 500 }
    );
  }
}

// --- PUT: Update a ticket ---
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Parse and validate ID
    const ticketId = await getTicketId(params);
    
    // Get request body
    const body = await request.json();
    
    // Validate input
    const validationResult = updateTicketSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      return NextResponse.json({ error: "Invalid input", details: errors }, { status: 400 });
    }
    
    const { 
      title, 
      description, 
      status, 
      priority, 
      assigneeEmail, 
      assigneeId,
      sentiment,
      ai_summary,
      ai_suggested_assignee_id
    } = validationResult.data;
    
    // Fetch the current ticket state *before* the update to get old assigneeId
    const currentTicket = await db.query.tickets.findFirst({
      where: eq(tickets.id, ticketId),
      columns: { 
        id: true, 
        assigneeId: true, 
        title: true
      }
    });
    
    if (!currentTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }
    
    const oldAssigneeId = currentTicket.assigneeId;
    
    // Prepare update data
    const updateData: Partial<typeof tickets.$inferInsert> = {};
    
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (sentiment !== undefined) updateData.sentiment = sentiment;
    if (ai_summary !== undefined) updateData.ai_summary = ai_summary;
    if (ai_suggested_assignee_id !== undefined) updateData.ai_suggested_assignee_id = ai_suggested_assignee_id;
    
    // Handle assignee - properly handle all the same validation cases as before
    let newAssigneeId = oldAssigneeId; // Default to keeping the old assigneeId
    
    if (assigneeId !== undefined) {
      if (assigneeId === null) {
        // Explicitly setting to null (unassigning)
        newAssigneeId = null;
        updateData.assigneeId = null;
      } else {
        // Find user by ID to verify it exists
        const assignee = await db.query.users.findFirst({
          where: eq(users.id, assigneeId),
          columns: { id: true }
        });
        
        if (!assignee) {
          return NextResponse.json(
            { error: `Assignee with ID "${assigneeId}" not found` },
            { status: 404 }
          );
        }
        
        newAssigneeId = assigneeId;
        updateData.assigneeId = assigneeId;
      }
    } else if (assigneeEmail !== undefined) {
      if (assigneeEmail === null) {
        // Explicitly unassigning
        newAssigneeId = null;
        updateData.assigneeId = null;
      } else {
        // Find user by email
        const assignee = await db.query.users.findFirst({
          where: eq(users.email, assigneeEmail),
          columns: { id: true }
        });
        
        if (!assignee) {
          return NextResponse.json(
            { error: `Assignee with email "${assigneeEmail}" not found` },
            { status: 404 }
          );
        }
        
        newAssigneeId = assignee.id;
        updateData.assigneeId = assignee.id;
      }
    }
    
    // Add updated timestamp
    updateData.updatedAt = new Date();
    
    // Make sure assigneeId changes are included in the updateData if needed
    // This ensures we capture unassignment properly too
    if (newAssigneeId !== oldAssigneeId) {
      updateData.assigneeId = newAssigneeId;
    }
    
    // --- Start Notification Logic ---
    let notificationSent = false;
    
    // Condition: Send notification if new assignee exists AND is different from old assignee
    if (newAssigneeId && newAssigneeId !== oldAssigneeId) {
      console.log(`API Info: Assignee changed for ticket ${ticketId}. Old: ${oldAssigneeId}, New: ${newAssigneeId}. Attempting notification...`);
      
      try {
        // Fetch the new assignee's details
        const newAssigneeUser = await db.query.users.findFirst({
          where: eq(users.id, newAssigneeId),
          columns: { email: true, name: true }
        });
        
        if (newAssigneeUser?.email) {
          // Construct email content
          const ticketUrl = `${process.env.NEXT_PUBLIC_APP_URL}/tickets/${ticketId}`;
          const emailSubject = `Ticket Assigned: #${ticketId} - ${currentTicket.title}`;
          const emailBody = `
            <p>Hello ${newAssigneeUser.name || 'User'},</p>
            <p>You have been assigned ticket #${ticketId}: "${currentTicket.title}".</p>
            <p>You can view the ticket details here:</p>
            <p><a href="${ticketUrl}">${ticketUrl}</a></p>
            <p>Thank you,<br/>Ticket System</p>
          `;
          
          // Send the email using the new notification function
          const emailSent = await sendNotificationEmail({
            recipientEmail: newAssigneeUser.email,
            recipientName: newAssigneeUser.name || undefined,
            subject: emailSubject,
            htmlBody: emailBody,
            senderName: "Ticket System"
          });
          
          if (emailSent) {
            notificationSent = true;
            console.log(`API Info: Assignment notification email sent to ${newAssigneeUser.email} for ticket ${ticketId}.`);
          } else {
            console.error(`API Error: Failed to send assignment notification email for ticket ${ticketId} to ${newAssigneeUser.email}.`);
          }
        } else {
          console.warn(`API Warning: Could not find email for new assignee ID ${newAssigneeId} on ticket ${ticketId}. Notification not sent.`);
        }
      } catch (notificationError) {
        console.error(`API Error: Exception during assignment notification for ticket ${ticketId}:`, notificationError);
        // Log but continue with the update - don't fail the ticket update if notification fails
      }
    }
    // --- End Notification Logic ---
    
    // Update the ticket
    const [updatedTicket] = await db
      .update(tickets)
      .set(updateData)
      .where(eq(tickets.id, ticketId))
      .returning();
    
    console.log(`API Info [PUT /api/tickets/${ticketId}]: Ticket updated successfully. Notification sent: ${notificationSent}`);
    return NextResponse.json(
      { message: 'Ticket updated successfully', ticket: updatedTicket },
      { status: 200 }
    );
    
  } catch (error) {
    console.error(`API Error [PUT /api/tickets/${params.id}]:`, error);
    
    // Handle specific error types
    if (error instanceof Error && error.message === 'Invalid ticket ID') {
      return NextResponse.json({ error: 'Invalid ticket ID format' }, { status: 400 });
    }
    
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    );
  }
}

// --- DELETE: Delete a ticket ---
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Parse and validate ID
    const ticketId = await getTicketId(params);
    
    // Check if ticket exists
    const existingTicket = await db.query.tickets.findFirst({
      where: eq(tickets.id, ticketId),
      columns: { id: true }
    });
    
    if (!existingTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }
    
    // Delete the ticket
    // Note: In a real application, you might want to:
    // 1. Check permissions first (is user allowed to delete?)
    // 2. Consider soft deletion (setting a deleted flag instead)
    // 3. Handle cascading deletes for related data like comments
    
    await db.delete(tickets).where(eq(tickets.id, ticketId));
    
    console.log(`API Info [DELETE /api/tickets/${ticketId}]: Ticket deleted successfully.`);
    return NextResponse.json(
      { message: 'Ticket deleted successfully' },
      { status: 200 }
    );
    
  } catch (error) {
    console.error(`API Error [DELETE /api/tickets/${params.id}]:`, error);
    
    // Handle specific error types
    if (error instanceof Error && error.message === 'Invalid ticket ID') {
      return NextResponse.json({ error: 'Invalid ticket ID format' }, { status: 400 });
    }
    
    return NextResponse.json(
      { error: 'Failed to delete ticket' },
      { status: 500 }
    );
  }
} 