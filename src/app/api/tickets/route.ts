import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { tickets, users, projects, ticketPriorityEnum, ticketStatusEnum } from '@/db/schema';
import { eq, desc, asc, and, or, ilike, sql } from 'drizzle-orm';
import { z } from 'zod';

// --- Zod Schema for Validation ---
const createTicketSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }).max(255),
  description: z.string().min(1, { message: "Description is required" }),
  projectName: z.string().min(1, { message: "Project name is required" }),
  assigneeEmail: z.string().email().nullable().optional(), // Optional assignee
  priority: z.enum(ticketPriorityEnum.enumValues).optional().default(ticketPriorityEnum.enumValues[1]), // Default medium
  status: z.enum(ticketStatusEnum.enumValues).optional().default(ticketStatusEnum.enumValues[0]), // Default open
  // Email-related fields for tickets created from emails
  senderEmail: z.string().email().optional(),
  senderName: z.string().optional(),
  externalMessageId: z.string().optional(),
});

// --- GET: Fetch tickets with filtering and sorting ---
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // --- Extract Filters ---
    const statusFilter = searchParams.get('status');
    const priorityFilter = searchParams.get('priority');
    const projectIdFilter = searchParams.get('projectId'); // Filter by project ID
    const assigneeIdFilter = searchParams.get('assigneeId'); // Filter by assignee ID
    const searchTerm = searchParams.get('search');

    // --- Extract Sorting ---
    const sortBy = searchParams.get('sortBy') || 'createdAt'; // Default sort
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'; // Default desc

    // --- Build Where Clause Dynamically ---
    const conditions = [];
    if (statusFilter && ticketStatusEnum.enumValues.includes(statusFilter as any)) {
      conditions.push(eq(tickets.status, statusFilter as typeof ticketStatusEnum.enumValues[number]));
    }
    if (priorityFilter && ticketPriorityEnum.enumValues.includes(priorityFilter as any)) {
      conditions.push(eq(tickets.priority, priorityFilter as typeof ticketPriorityEnum.enumValues[number]));
    }
    if (projectIdFilter && !isNaN(parseInt(projectIdFilter))) {
      conditions.push(eq(tickets.projectId, parseInt(projectIdFilter)));
    }
    if (assigneeIdFilter) {
      if (assigneeIdFilter === 'unassigned') {
        conditions.push(sql`${tickets.assigneeId} is null`);
      } else if (!isNaN(parseInt(assigneeIdFilter))) {
        conditions.push(eq(tickets.assigneeId, parseInt(assigneeIdFilter)));
      }
    }
    if (searchTerm) {
      const term = `%${searchTerm}%`;
      conditions.push(
        or(
          ilike(tickets.title, term),
          ilike(sql`COALESCE(${tickets.description}, '')`, term),
          ilike(sql`COALESCE(${tickets.senderEmail}, '')`, term),
          ilike(sql`COALESCE(${tickets.orderNumber}, '')`, term)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // --- Build OrderBy Clause ---
    let orderByClause;
    const orderDirection = sortOrder === 'asc' ? asc : desc;

    switch (sortBy) {
      case 'title':
        orderByClause = [orderDirection(tickets.title)];
        break;
      case 'status':
        orderByClause = [orderDirection(tickets.status)];
        break;
      case 'priority':
        orderByClause = [orderDirection(tickets.priority)];
        break;
      case 'project':
        // Sorting by project requires a join, so we'll sort by project ID as a fallback
        orderByClause = [orderDirection(tickets.projectId)];
        break;
      case 'assignee':
        // Sorting by assignee requires a join, so we'll sort by assignee ID as a fallback
        orderByClause = [orderDirection(tickets.assigneeId)];
        break;
      case 'updatedAt':
        orderByClause = [orderDirection(tickets.updatedAt)];
        break;
      case 'createdAt':
      default:
        orderByClause = [desc(tickets.createdAt)]; // Default sort by newest created
    }

    // --- Fetch Data ---
    const filteredTickets = await db.query.tickets.findMany({
      where: whereClause,
      orderBy: orderByClause,
      columns: {
        id: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        senderEmail: true,
        senderName: true,
        externalMessageId: true,
        description: true, // Include description for search
        orderNumber: true, // Include order number for search
        trackingNumber: true,
        assigneeId: true, // Needed for filtering
        projectId: true, // Needed for filtering
        type: true, // Include ticket type
      },
      with: {
        project: { columns: { id: true, name: true } },
        assignee: { columns: { id: true, name: true, email: true } },
        reporter: { columns: { id: true, name: true, email: true } }
      },
    });

    // --- Format Response ---
    const responseData = filteredTickets.map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      type: t.type,
      createdAt: t.createdAt.toISOString(), // Send as ISO string
      updatedAt: t.updatedAt.toISOString(),
      projectName: t.project?.name ?? 'N/A',
      projectId: t.project?.id,
      assigneeName: t.assignee?.name ?? 'Unassigned',
      assigneeId: t.assignee?.id,
      assigneeEmail: t.assignee?.email,
      reporterName: t.reporter?.name ?? 'Unknown',
      reporterId: t.reporter?.id,
      reporterEmail: t.reporter?.email,
      senderEmail: t.senderEmail,
      senderName: t.senderName,
      description: t.description,
      isFromEmail: Boolean(t.externalMessageId),
      orderNumber: t.orderNumber,
      trackingNumber: t.trackingNumber,
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
      senderEmail: senderEmail || null,
      senderName: senderName || null,
      externalMessageId: externalMessageId || null,
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