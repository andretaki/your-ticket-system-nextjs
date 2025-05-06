// src/components/TicketListClient.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import Link from 'next/link';
import TicketDisplay from './TicketDisplay'; // Import DisplayTicket type from here

// Type matching the flattened response from GET /api/tickets
interface TicketListEntry {
  id: number;
  title: string;
  status: string;
  priority: string;
  type?: string | null;
  createdAt: string; // Comes as string
  updatedAt: string;
  // projectName: string; // REMOVED
  assigneeName: string | null;
  reporterName: string | null;
  displayId?: string; // Optional
  description?: string | null;
}

interface TicketListClientProps {
  limit?: number;
  showSearch?: boolean;
}

export default function TicketListClient({ limit, showSearch = true }: TicketListClientProps) {
  const [tickets, setTickets] = useState<TicketListEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await axios.get<TicketListEntry[]>('/api/tickets');
      let filteredTickets = res.data;
      
      if (limit && limit > 0) {
        filteredTickets = filteredTickets.slice(0, limit);
      }
      
      setTickets(filteredTickets);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError('Failed to load tickets.');
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const deleteTicket = async (id: number) => {
    setError(null);
    try {
      await axios.delete(`/api/tickets/${id}`);
      fetchTickets();
    } catch (err: unknown) {
      console.error('Error deleting ticket:', err);
      let message = 'Failed to delete ticket.';
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<{ error?: string }>;
        message = axiosError.response?.data?.error || message;
      }
      setError(message);
      setTimeout(() => setError(null), 5000);
    }
  };

  if (isLoading) return <div className="text-center py-5">Loading tickets...</div>;

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-light d-flex justify-content-between align-items-center">
        <h3 className="mb-0 h5">{limit ? 'Recent Tickets' : 'All Tickets'}</h3>
        {showSearch && (
          <Link href="/tickets/create" className="btn btn-success btn-sm">
            <i className="fas fa-plus me-1"></i> Create New Ticket
          </Link>
        )}
      </div>
      <div className="card-body">
        {error && <div className="alert alert-danger alert-dismissible fade show">{error} <button type="button" className="btn-close" onClick={() => setError(null)} aria-label="Close"></button></div>}
        <div className="table-responsive">
          <table className="table table-hover table-striped">
            <thead className="thead-light">
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th style={{minWidth: '200px'}}>Description</th>
                <th>Assignee</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length > 0 ? tickets.map(ticket => (
                <TicketDisplay
                  ticket={{
                    ...ticket,
                    createdAt: new Date(ticket.createdAt),
                    updatedAt: new Date(ticket.updatedAt),
                  }}
                  deleteTicket={deleteTicket}
                  refreshTickets={fetchTickets}
                  key={ticket.id}
                />
              )) : (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-4 fst-italic">No tickets found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}