import { NextResponse } from 'next/server';
import { db } from '@/db';
import { tickets, users, projects, priorityEnum, statusEnum } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// --- Zod Schema for Validation ---
const updateTicketSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }).max(255).optional(),
  description: z.string().min(1, { message: "Description is required" }).optional(),
  status: z.enum(statusEnum.enumValues).optional(),
  priority: z.enum(priorityEnum.enumValues).optional(),
  assigneeEmail: z.string().email().nullable().optional(), // Optional assignee
});

// Helper to parse and validate ticket ID
const getTicketId = (params: { id: string }) => {
  const id = parseInt(params.id);
  if (isNaN(id)) {
    throw new Error('Invalid ticket ID');
  }
  return id;
};

// --- GET: Fetch a single ticket with detailed information ---
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Parse and validate ID
    const ticketId = getTicketId(params);

    // Fetch the ticket with relations
    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, ticketId),
      with: {
        project: true,
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
    const ticketId = getTicketId(params);
    
    // Get request body
    const body = await request.json();
    
    // Validate input
    const validationResult = updateTicketSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      return NextResponse.json({ error: "Invalid input", details: errors }, { status: 400 });
    }
    
    const { title, description, status, priority, assigneeEmail } = validationResult.data;
    
    // Check if ticket exists
    const existingTicket = await db.query.tickets.findFirst({
      where: eq(tickets.id, ticketId),
      columns: { id: true }
    });
    
    if (!existingTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }
    
    // Prepare update data
    const updateData: Partial<typeof tickets.$inferInsert> = {};
    
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    
    // Handle assignee email if provided
    if (assigneeEmail !== undefined) {
      if (assigneeEmail === null) {
        // Explicitly setting to null (unassigning)
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
        
        updateData.assigneeId = assignee.id;
      }
    }
    
    // Add updated timestamp
    updateData.updatedAt = new Date();
    
    // Update the ticket
    const [updatedTicket] = await db
      .update(tickets)
      .set(updateData)
      .where(eq(tickets.id, ticketId))
      .returning();
    
    console.log(`API Info [PUT /api/tickets/${ticketId}]: Ticket updated successfully.`);
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
    const ticketId = getTicketId(params);
    
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