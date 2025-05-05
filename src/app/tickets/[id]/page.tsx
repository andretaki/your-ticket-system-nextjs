import { notFound } from 'next/navigation';
import { db } from '@/db';
import { tickets } from '@/db/schema';
import { eq } from 'drizzle-orm';
import TicketViewClient from '@/components/TicketViewClient'; // Import the client component
import { Metadata } from 'next';

interface TicketViewPageProps {
  params: {
    id: string; // Route parameters are always strings
  };
}

// Function to generate metadata dynamically
export async function generateMetadata({ params }: TicketViewPageProps): Promise<Metadata> {
    const ticketId = parseInt(params.id, 10);
    if (isNaN(ticketId)) {
        return { title: 'Invalid Ticket - Issue Tracker' };
    }

    const ticket = await db.query.tickets.findFirst({
        where: eq(tickets.id, ticketId),
        columns: { title: true },
    });

    return {
        title: ticket ? `Ticket #${ticketId}: ${ticket.title} - Issue Tracker` : 'Ticket Not Found - Issue Tracker',
        description: `Details and comments for ticket #${ticketId}.`,
    };
}

export default async function TicketViewPage({ params }: TicketViewPageProps) {
  const ticketId = parseInt(params.id, 10);

  // Validate ID
  if (isNaN(ticketId)) {
    notFound(); // Use Next.js notFound for invalid ID format
  }

  // Fetch ticket data server-side
  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.id, ticketId),
    with: {
      // project: true, // No longer exists
      assignee: { columns: { id: true, name: true, email: true } },
      reporter: { columns: { id: true, name: true, email: true } },
      comments: {
        with: { commenter: { columns: { id: true, name: true, email: true } } },
        orderBy: (comments, { asc }) => [asc(comments.createdAt)]
      }
    }
  });

  // Handle ticket not found
  if (!ticket) {
    notFound();
  }

  // Convert dates to string for serialization before passing to client component
  // (Alternatively, pass Date objects and handle formatting entirely client-side)
  const serializedTicket = {
    ...ticket,
    // No project data to serialize
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    comments: ticket.comments.map(comment => ({
        ...comment,
        createdAt: comment.createdAt.toISOString(),
    })),
  };

  // Pass the fetched data to the client component
  // Note: You'll need to adjust the type definition in TicketViewClient accordingly
  return (
      <div className="container-fluid py-4">
          {/* Cast to 'any' temporarily if type issues arise during prop passing, then fix types */}
          <TicketViewClient initialTicket={serializedTicket as any} />
      </div>
  );
} 