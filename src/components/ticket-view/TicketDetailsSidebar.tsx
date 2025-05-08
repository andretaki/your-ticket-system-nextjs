'use client';

import React from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ticketPriorityEnum } from '@/db/schema';

// Type definitions
type BaseUser = {
  id: string;
  name: string | null;
  email: string | null;
};

interface TicketData {
  id: number;
  title: string;
  priority: string;
  type: string | null;
  reporter: BaseUser | null;
  senderName: string | null;
  senderEmail: string | null;
  senderPhone?: string | null;
  orderNumber: string | null;
  trackingNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TicketDetailsSidebarProps {
  ticket: TicketData;
}

// Helper functions
const getPriorityClass = (priority: string | null): string => {
  switch (priority?.toLowerCase()) {
    case 'low': return 'badge bg-success';
    case 'medium': return 'badge bg-warning text-dark';
    case 'high': return 'badge bg-danger';
    case 'urgent': return 'badge bg-danger fw-bold text-white';
    default: return 'badge bg-light text-dark border';
  }
};

const parseDate = (dateString: string | Date | null | undefined): Date | null => {
  if (!dateString) return null;
  if (dateString instanceof Date) return dateString;
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

export default function TicketDetailsSidebar({ ticket }: TicketDetailsSidebarProps) {
  const createdAtDate = parseDate(ticket.createdAt);
  const updatedAtDate = parseDate(ticket.updatedAt);

  return (
    <div className="ticket-details-sidebar">
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-light">
          <h3 className="h6 mb-0">Ticket Details</h3>
        </div>
        <div className="card-body p-0">
          <ul className="list-group list-group-flush">
            {/* Priority */}
            <li className="list-group-item d-flex justify-content-between align-items-center">
              <span className="text-muted">Priority</span>
              <span className={getPriorityClass(ticket.priority)}>
                {ticket.priority?.toUpperCase() || 'NONE'}
              </span>
            </li>
            
            {/* Type if available */}
            {ticket.type && (
              <li className="list-group-item d-flex justify-content-between align-items-center">
                <span className="text-muted">Type</span>
                <span>{ticket.type}</span>
              </li>
            )}
            
            {/* Created */}
            <li className="list-group-item d-flex justify-content-between align-items-center">
              <span className="text-muted">Created</span>
              <span 
                className="text-end small" 
                title={createdAtDate ? format(createdAtDate, 'PPpp') : 'Unknown'}
              >
                {createdAtDate ? formatDistanceToNow(createdAtDate, { addSuffix: true }) : 'N/A'}
              </span>
            </li>
            
            {/* Updated */}
            <li className="list-group-item d-flex justify-content-between align-items-center">
              <span className="text-muted">Updated</span>
              <span 
                className="text-end small" 
                title={updatedAtDate ? format(updatedAtDate, 'PPpp') : 'Unknown'}
              >
                {updatedAtDate ? formatDistanceToNow(updatedAtDate, { addSuffix: true }) : 'N/A'}
              </span>
            </li>
          </ul>
        </div>
      </div>
      
      {/* Customer Information Card */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-light">
          <h3 className="h6 mb-0">Customer Information</h3>
        </div>
        <div className="card-body">
          {/* Name */}
          <div className="mb-2">
            <div className="d-flex align-items-center">
              <i className="fas fa-user-circle fa-fw me-2 text-secondary"></i>
              <span className="fw-medium">
                {ticket.senderName || ticket.reporter?.name || <span className='fst-italic text-muted'>Not Provided</span>}
              </span>
            </div>
          </div>
          
          {/* Email */}
          {(ticket.senderEmail || ticket.reporter?.email) && (
            <div className="mb-2">
              <div className="d-flex align-items-center">
                <i className="fas fa-envelope fa-fw me-2 text-secondary"></i>
                <span className="text-break small">
                  {ticket.senderEmail || ticket.reporter?.email}
                </span>
              </div>
            </div>
          )}
          
          {/* Phone */}
          {ticket.senderPhone && (
            <div className="mb-2">
              <div className="d-flex align-items-center">
                <i className="fas fa-phone fa-fw me-2 text-secondary"></i>
                <span className="small">{ticket.senderPhone}</span>
              </div>
            </div>
          )}
          
          {/* Order/Tracking */}
          {(ticket.orderNumber || ticket.trackingNumber) && (
            <>
              <hr className="my-3" />
              
              {ticket.orderNumber && (
                <div className="mb-2">
                  <div className="d-flex align-items-start">
                    <i className="fas fa-shopping-cart fa-fw me-2 mt-1 text-secondary"></i>
                    <div>
                      <div className="text-muted small text-uppercase">Order Number</div>
                      <strong>{ticket.orderNumber}</strong>
                    </div>
                  </div>
                </div>
              )}
              
              {ticket.trackingNumber && (
                <div className="mb-0">
                  <div className="d-flex align-items-start">
                    <i className="fas fa-truck fa-fw me-2 mt-1 text-secondary"></i>
                    <div>
                      <div className="text-muted small text-uppercase">Tracking Number</div>
                      <span className="text-break">{ticket.trackingNumber}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
} 