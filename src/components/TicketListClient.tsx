'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import Link from 'next/link';
import TicketDisplay from './TicketDisplay';

// Type matching the flattened response from GET /api/tickets
interface TicketListEntry {
  id: number;
  title: string;
  status: string;
  priority: string;
  type?: string | null;
  createdAt: string; // Comes as string
  updatedAt: string;
  projectName: string;
  assigneeName: string | null;
  reporterName: string | null;
  displayId?: string; // Optional
  description?: string | null;
}

// Type expected by TicketDisplay (with Date objects)
interface DisplayTicketInternal extends Omit<TicketListEntry, 'createdAt' | 'updatedAt'> {
    createdAt: Date;
    updatedAt: Date;
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
      
      // Apply limit if provided
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
    setError(null); // Clear previous errors
    try {
      await axios.delete(`/api/tickets/${id}`);
      // Re-fetch the list after successful deletion
      fetchTickets();
      // Or filter locally: setTickets(currentTickets => currentTickets.filter(t => t.id !== id));
    } catch (err: unknown) { // Catch unknown type
      console.error('Error deleting ticket:', err);
      let message = 'Failed to delete ticket.';
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<{ error?: string }>; // Type assertion
        message = axiosError.response?.data?.error || message;
      }
      setError(message);
      // Optionally clear error after a few seconds
      setTimeout(() => setError(null), 5000);
    }
  };

  if (isLoading) return <div className="text-center py-5">Loading tickets...</div>;

  return (
    <div className="card shadow-sm"> {/* Add subtle shadow */}
      <div className="card-header bg-light d-flex justify-content-between align-items-center">
        <h3 className="mb-0 h5">{limit ? 'Recent Tickets' : 'All Tickets'}</h3> {/* Adjusted heading size */}
        {showSearch && (
          <Link href="/tickets/create" className="btn btn-success btn-sm"> {/* Smaller button */}
            <i className="fas fa-plus me-1"></i> Create New Ticket
          </Link>
        )}
      </div>
      <div className="card-body">
        {error && <div className="alert alert-danger alert-dismissible fade show">{error} <button type="button" className="btn-close" onClick={() => setError(null)} aria-label="Close"></button></div>}
        <div className="table-responsive">
          <table className="table table-hover table-striped"> {/* Added striped */}
            <thead className="thead-light">
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th style={{minWidth: '200px'}}>Description</th> {/* Ensure desc col width */}
                <th>Project</th>
                <th>Assignee</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length > 0 ? (
                tickets.map(ticket => (
                  <TicketDisplay
                    // Convert dates here or handle inside TicketDisplay
                    ticket={{
                      ...ticket,
                      createdAt: new Date(ticket.createdAt),
                      updatedAt: new Date(ticket.updatedAt),
                    }}
                    deleteTicket={deleteTicket}
                    refreshTickets={fetchTickets} // Pass fetchTickets as refresh callback
                    key={ticket.id}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="text-center text-muted py-4 fst-italic"> {/* Italicized text */}
                    No tickets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 