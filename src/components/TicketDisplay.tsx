// src/components/TicketDisplay.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import MarkButtonClient from './MarkButtonClient';
import { ticketPriorityEnum } from '@/db/schema';

export interface DisplayTicket {
  id: number;
  title: string;
  status: string;
  priority: string;
  type?: string | null;
  // projectName: string; // REMOVED
  assigneeName: string | null;
  reporterName: string | null;
  createdAt: Date;
  updatedAt: Date;
  displayId?: string;
  description?: string | null;
}

interface TicketDisplayProps {
  ticket: DisplayTicket;
  deleteTicket: (id: number) => Promise<void>;
  refreshTickets: () => void;
}

const TicketDisplay: React.FC<TicketDisplayProps> = ({ ticket, deleteTicket, refreshTickets }) => {
  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new': return 'badge bg-info text-dark';
      case 'open': return 'badge bg-secondary';
      case 'in_progress': return 'badge bg-primary';
      case 'pending_customer': return 'badge bg-warning text-dark';
      case 'closed': return 'badge bg-success';
      default: return 'badge bg-secondary';
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'badge bg-danger';
      case 'medium': return 'badge bg-warning text-dark';
      case 'low': return 'badge bg-success'; // Changed from info to success for better distinction
      case 'urgent': return 'badge bg-danger fw-bold'; // Make urgent stand out
      default: return 'badge bg-secondary';
    }
  };

  const getTypeClass = (type?: string | null) => {
    if (!type) return 'badge bg-light text-dark border';
    
    switch (type.toLowerCase()) {
      case 'return': return 'badge bg-warning text-dark';
      case 'shipping issue': return 'badge bg-danger';
      case 'order issue': return 'badge bg-danger fw-bold';
      case 'new order': return 'badge bg-success';
      case 'credit request': return 'badge bg-info text-dark';
      case 'coa request': return 'badge bg-primary';
      case 'coc request': return 'badge bg-primary';
      case 'sds request': return 'badge bg-primary';
      case 'quote request': return 'badge bg-info';
      case 'purchase order': return 'badge bg-success';
      case 'general inquiry': return 'badge bg-secondary';
      case 'test entry': return 'badge bg-light text-dark';
      default: return 'badge bg-secondary';
    }
  };

  const displayType = ticket.type || 'N/A';
  const formattedCreatedAt = formatDistanceToNow(ticket.createdAt, { addSuffix: true });
  const formattedUpdatedAt = formatDistanceToNow(ticket.updatedAt, { addSuffix: true });
  
  const truncateDescription = (desc?: string | null) => {
    if (!desc) return 'No description';
    return desc.length > 100 ? `${desc.substring(0, 100)}...` : desc;
  };
  
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this ticket?')) {
      await deleteTicket(ticket.id);
    }
  };

  return (
    <tr>
      <td>{ticket.displayId || ticket.id}</td>
      <td>
        <Link href={`/tickets/${ticket.id}`} className="text-decoration-none">
          {ticket.title}
        </Link>
        <small className="d-block text-muted">
          Created {formattedCreatedAt} | Updated {formattedUpdatedAt}
        </small>
      </td>
      <td>{truncateDescription(ticket.description)}</td>
      {/* <td>{ticket.projectName}</td> */} {/* REMOVED Project Column */}
      <td>{ticket.assigneeName || 'Unassigned'}</td>
      <td>
        <span className={getPriorityClass(ticket.priority)}>
          {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
        </span>
      </td>
      <td>
        <span className={getStatusClass(ticket.status)}>
          {ticket.status.replace('_', ' ').charAt(0).toUpperCase() + ticket.status.replace('_', ' ').slice(1)}
        </span>
      </td>
      <td>
        <span className={getTypeClass(ticket.type)}>
          {displayType}
        </span>
      </td>
      <td>
        <div className="btn-group-vertical w-100">
          <Link href={`/tickets/${ticket.id}/edit`} className="btn btn-outline-primary btn-sm w-100 text-start mb-1">
            <i className="fas fa-edit me-1"></i> Edit
          </Link>
          <button onClick={handleDelete} className="btn btn-outline-danger btn-sm w-100 text-start mb-1">
            <i className="fas fa-trash-alt me-1"></i> Delete
          </button>
          <MarkButtonClient
            initialStatus={ticket.status}
            ticketId={ticket.id}
            onStatusChange={refreshTickets}
          />
        </div>
      </td>
    </tr>
  );
};

export default TicketDisplay;