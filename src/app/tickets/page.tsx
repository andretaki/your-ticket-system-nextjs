import { Metadata } from 'next';
import TicketListClient from '@/components/TicketListClient';

export const metadata: Metadata = {
  title: 'All Tickets - Issue Tracker',
  description: 'View and manage all support tickets.',
};

export default function TicketsListPage() {
  return (
    <div className="container-fluid py-4">
      {/* Page-specific header elements could go here */}
      <TicketListClient />
    </div>
  );
} 