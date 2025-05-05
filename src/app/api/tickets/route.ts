import { NextResponse } from 'next/server';
import { db } from '@/db';
import { tickets, users, projects, priorityEnum, statusEnum } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

// --- Zod Schema for Validation ---
const createTicketSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }).max(255),
  description: z.string().min(1, { message: "Description is required" }),
  projectName: z.string().min(1, { message: "Project name is required" }),
  assigneeEmail: z.string().email().nullable().optional(), // Optional assignee
  priority: z.enum(priorityEnum.enumValues).optional().default(priorityEnum.enumValues[1]), // Default medium
  status: z.enum(statusEnum.enumValues).optional().default(statusEnum.enumValues[0]), // Default open
  // Email-related fields for tickets created from emails
  senderEmail: z.string().email().optional(),
  senderName: z.string().optional(),
  externalMessageId: z.string().optional(),
});

// --- GET: Fetch all tickets ---
export async function GET() {
  try {
    const allTickets = await db.query.tickets.findMany({
      columns: { // Select specific columns to optimize payload
        id: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        senderEmail: true, // Include sender details
        senderName: true,
        externalMessageId: true, // Include to check if ticket was created from email
      },
      with: {
        project: { columns: { name: true } },
        assignee: { columns: { name: true } },
        reporter: { columns: { name: true } } // Assuming reporter relation exists
      },
      orderBy: [desc(tickets.createdAt)]
    });

    // Flatten the structure slightly for easier frontend consumption
    const responseData = allTickets.map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      projectName: t.project?.name ?? 'N/A',
      assigneeName: t.assignee?.name ?? 'Unassigned',
      reporterName: t.reporter?.name ?? 'Unknown',
      senderEmail: t.senderEmail, // Include sender email if available
      senderName: t.senderName,   // Include sender name if available
      isFromEmail: Boolean(t.externalMessageId), // Flag if ticket was created from email
    }));

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('API Error [GET /api/tickets]:', error);
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
}

// --- POST: Create a new ticket ---
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // --- Input Validation ---
    const validationResult = createTicketSchema.safeParse(body);
    if (!validationResult.success) {
      // Format Zod errors for a user-friendly response
      const errors = validationResult.error.flatten().fieldErrors;
      console.warn('API Validation Error [POST /api/tickets]:', errors);
      return NextResponse.json({ error: "Invalid input", details: errors }, { status: 400 });
    }

    const { 
      title, 
      description, 
      projectName, 
      assigneeEmail, 
      priority, 
      status,
      senderEmail,
      senderName,
      externalMessageId 
    } = validationResult.data;

    // --- Find Related Entities ---
    const project = await db.query.projects.findFirst({
      where: eq(projects.name, projectName),
      columns: { id: true }
    });
    if (!project) {
      return NextResponse.json({ error: `Project "${projectName}" not found` }, { status: 404 });
    }

    let assigneeId: number | null = null;
    if (assigneeEmail) {
      const assignee = await db.query.users.findFirst({
        where: eq(users.email, assigneeEmail),
        columns: { id: true }
      });
      if (!assignee) {
        // If assignee is specified but not found, return an error
        return NextResponse.json({ error: `Assignee with email "${assigneeEmail}" not found` }, { status: 404 });
      }
      assigneeId = assignee.id;
    }

    // TODO: Auth - Replace placeholder with actual logged-in user ID
    const reporterId = 1; // Placeholder - Should come from session/token

    // --- Create Ticket ---
    const [newTicket] = await db.insert(tickets).values({
      title,
      description,
      projectId: project.id,
      assigneeId,
      reporterId,
      priority, // Uses validated default if not provided
      status, // Uses validated default if not provided
      senderEmail: senderEmail ?? null,
      senderName: senderName ?? null,
      externalMessageId: externalMessageId ?? null,
    }).returning();

    console.log(`API Info [POST /api/tickets]: Ticket ${newTicket.id} created successfully.`);
    return NextResponse.json(
      { message: 'Ticket created successfully', ticket: newTicket },
      { status: 201 }
    );

  } catch (error) {
    console.error('API Error [POST /api/tickets]:', error);
    // Add check for specific DB errors if necessary (e.g., unique constraints)
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }
} 