import { Metadata } from 'next';
import EditTicketClient from '@/components/EditTicketClient';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Edit Ticket - Issue Tracker',
  description: 'Edit an existing support ticket.',
};

interface EditTicketPageProps {
  params: {
    id: string; // Route parameters are always strings
  };
}

export default function EditTicketPage({ params }: EditTicketPageProps) {
  const ticketId = parseInt(params.id, 10);

  // Basic validation: Check if the ID is a valid number
  if (isNaN(ticketId)) {
    notFound(); // Use Next.js notFound helper for invalid IDs
  }

  return (
    <div className="container py-4">
      <EditTicketClient ticketId={ticketId} />
    </div>
  );
} 