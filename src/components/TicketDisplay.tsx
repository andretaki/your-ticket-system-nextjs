'use client';

import React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import MarkButtonClient from './MarkButtonClient';
import { priorityEnum } from '@/db/schema';

// Type definition for a ticket with Date objects
export interface DisplayTicket {
  id: number;
  title: string;
  status: string;
  priority: string;
  type?: string | null;
  projectName: string;
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

// Helper function for priority styling
const PriorityCell: React.FC<{ priority: string }> = ({ priority }) => {
  let className = '';
  
  switch (priority) {
    case priorityEnum.enumValues[0]: // 'low'
      className = 'low-priority text-success fw-bold'; // Use Bootstrap classes
      break;
    case priorityEnum.enumValues[1]: // 'medium'
      className = 'med-priority text-warning fw-bold';
      break;
    case priorityEnum.enumValues[2]: // 'high'
      className = 'high-priority text-danger fw-bold';
      break;
    default:
      className = 'text-secondary fw-bold';
  }
  
  return <td className={className}>{priority}</td>;
};

const TicketDisplay: React.FC<TicketDisplayProps> = ({ ticket, deleteTicket, refreshTickets }) => {
  // Get status and priority classes
  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return 'badge bg-secondary';
      case 'in_progress': return 'badge bg-primary';
      case 'resolved': return 'badge bg-success';
      case 'closed': return 'badge bg-dark';
      default: return 'badge bg-secondary';
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'badge bg-danger';
      case 'medium': return 'badge bg-warning text-dark';
      case 'low': return 'badge bg-info text-dark';
      default: return 'badge bg-secondary';
    }
  };

  const getTypeClass = (type?: string | null) => {
    if (!type) return 'badge bg-secondary';
    switch (type.toLowerCase()) {
      case 'bug': return 'badge bg-danger';
      case 'feature': return 'badge bg-primary';
      case 'task': return 'badge bg-info text-dark';
      default: return 'badge bg-secondary';
    }
  };

  const displayType = ticket.type || 'N/A';

  // Format dates
  const formattedCreatedAt = formatDistanceToNow(ticket.createdAt, { addSuffix: true });
  const formattedUpdatedAt = formatDistanceToNow(ticket.updatedAt, { addSuffix: true });
  
  // Truncate description for table display
  const truncateDescription = (desc?: string | null) => {
    if (!desc) return 'No description';
    return desc.length > 100 ? `${desc.substring(0, 100)}...` : desc;
  };
  
  // Handle delete with confirmation
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
      <td>{ticket.projectName}</td>
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