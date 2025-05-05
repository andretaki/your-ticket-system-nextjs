'use client';

import React, { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { ticketPriorityEnum, ticketStatusEnum, ticketTypeEcommerceEnum } from '@/db/schema';

// --- Types for Data Received from Server Component ---
interface BaseUser {
  id: number;
  name: string | null; // Allow null name
  email: string;
}

interface CommentData {
  id: number;
  commentText: string; // Ensure this matches schema column name
  createdAt: string; // Serialized Date string
  commenter: BaseUser | null; // Commenter might be null if user deleted
  isInternalNote: boolean;
  isFromCustomer: boolean;
}

interface TicketData {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  type: string | null; // Correct type from schema
  // project removed
  assignee: BaseUser | null;
  reporter: BaseUser | null; // Reporter might be null if user deleted
  createdAt: string; // Serialized Date string
  updatedAt: string; // Serialized Date string
  orderNumber: string | null;
  trackingNumber: string | null;
  senderEmail: string | null;
  senderName: string | null;
  comments: CommentData[];
}

interface TicketViewClientProps {
  initialTicket: TicketData;
}

// Helper to get badge classes
const getStatusClass = (status: string) => {
  switch (status) {
    case 'new': return 'badge bg-info text-dark';
    case 'open': return 'badge bg-secondary';
    case 'in_progress': return 'badge bg-primary';
    case 'pending_customer': return 'badge bg-warning text-dark';
    case 'closed': return 'badge bg-success';
    default: return 'badge bg-secondary';
  }
};

const getPriorityClass = (priority: string) => {
  switch (priority) {
    case 'low': return 'badge bg-success';
    case 'medium': return 'badge bg-info text-dark';
    case 'high': return 'badge bg-warning text-dark';
    case 'urgent': return 'badge bg-danger';
    default: return 'badge bg-secondary';
  }
};

export default function TicketViewClient({ initialTicket }: TicketViewClientProps) {
  const [ticket, setTicket] = useState<TicketData>(initialTicket);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [submitDisabled, setSubmitDisabled] = useState(false);

  // Refresh ticket data from API
  const refreshTicket = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<TicketData>(`/api/tickets/${ticket.id}`);
      setTicket(response.data);
    } catch (err) {
      console.error('Failed to refresh ticket data:', err);
      setError('Could not refresh ticket data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission for new comments
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitDisabled(true);
    setError(null);

    try {
      await axios.post(`/api/tickets/${ticket.id}/comments`, {
        content: newComment,
        isInternalNote
      });
      
      setNewComment(''); // Clear form
      await refreshTicket(); // Refresh to show new comment
    } catch (err: unknown) {
      console.error('Error posting comment:', err);
      let errorMessage = 'Failed to post comment. Please try again.';
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<{ error?: string }>;
        errorMessage = axiosError.response?.data?.error || errorMessage;
      }
      setError(errorMessage);
    } finally {
      setSubmitDisabled(false);
    }
  };

  // Handle updating ticket status
  const handleStatusChange = async (newStatus: string) => {
    setLoading(true);
    setError(null);
    try {
      await axios.patch(`/api/tickets/${ticket.id}`, { status: newStatus });
      await refreshTicket();
    } catch (err) {
      console.error('Failed to update ticket status:', err);
      setError('Could not update ticket status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ticket-view">
      {/* Ticket Header */}
      <div className="mb-4 d-flex justify-content-between align-items-start">
        <div>
          <h1 className="h2 mb-2">
            <span className="text-secondary">#{ticket.id}</span> {ticket.title}
          </h1>
          <div className="mb-2">
            <span className={getStatusClass(ticket.status)}>{ticket.status.replace('_', ' ')}</span>
            <span className={`${getPriorityClass(ticket.priority)} ms-2`}>{ticket.priority}</span>
            {ticket.type && <span className="badge bg-secondary ms-2">{ticket.type}</span>}
          </div>
          <p className="text-muted">
            Reported {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })} by{' '}
            {ticket.reporter?.name || ticket.senderName || ticket.senderEmail || 'Unknown'}
          </p>
        </div>
        <div>
          <Link href={`/tickets/${ticket.id}/edit`} className="btn btn-primary me-2">
            Edit
          </Link>
          <Link href="/tickets" className="btn btn-outline-secondary">
            Back to List
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="row">
        {/* Ticket Details - Left Column (8/12) */}
        <div className="col-md-8 mb-4">
          <div className="card">
            <div className="card-header">
              <h2 className="h5 mb-0">Ticket Details</h2>
            </div>
            <div className="card-body">
              {ticket.description ? (
                <div className="ticket-description mb-4">
                  <h3 className="h6">Description</h3>
                  <div className="bg-light p-3 rounded">
                    {/* Format description with line breaks */}
                    {ticket.description.split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        <br />
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted fst-italic">No description provided.</p>
              )}

              {/* Order Details Section (if available) */}
              {(ticket.orderNumber || ticket.trackingNumber) && (
                <div className="order-details mt-4">
                  <h3 className="h6 mb-3">Order Information</h3>
                  <table className="table table-sm">
                    <tbody>
                      {ticket.orderNumber && (
                        <tr>
                          <th style={{ width: '30%' }}>Order #:</th>
                          <td>{ticket.orderNumber}</td>
                        </tr>
                      )}
                      {ticket.trackingNumber && (
                        <tr>
                          <th>Tracking #:</th>
                          <td>{ticket.trackingNumber}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Comments Section */}
          <div className="card mt-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h5 mb-0">Comments</h2>
              <span className="badge bg-secondary">{ticket.comments.length}</span>
            </div>
            <div className="card-body">
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}

              {/* Comment List */}
              {ticket.comments.length > 0 ? (
                <div className="comments-list mb-4">
                  {ticket.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className={`comment-item p-3 mb-3 border rounded ${
                        comment.isInternalNote ? 'border-warning bg-light' : ''
                      }`}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="commenter">
                          <strong>
                            {comment.commenter?.name ||
                              (comment.isFromCustomer ? 'Customer' : 'System')}
                          </strong>
                          {comment.isInternalNote && (
                            <span className="badge bg-warning text-dark ms-2">Internal Note</span>
                          )}
                        </div>
                        <small className="text-muted">
                          {format(new Date(comment.createdAt), 'PPp')}
                        </small>
                      </div>
                      <div className="comment-text">
                        {/* Format comment text with line breaks */}
                        {comment.commentText.split('\n').map((line, i) => (
                          <React.Fragment key={i}>
                            {line}
                            <br />
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted fst-italic">No comments yet.</p>
              )}

              {/* Add Comment Form */}
              <form onSubmit={handleCommentSubmit} className="mt-4">
                <div className="mb-3">
                  <label htmlFor="commentText" className="form-label">
                    Add a Comment
                  </label>
                  <textarea
                    id="commentText"
                    className="form-control"
                    rows={4}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Type your comment here..."
                    required
                  ></textarea>
                </div>
                <div className="form-check mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="internalNoteCheck"
                    checked={isInternalNote}
                    onChange={(e) => setIsInternalNote(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="internalNoteCheck">
                    Mark as internal note (not visible to customer)
                  </label>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitDisabled || !newComment.trim()}
                >
                  {submitDisabled ? 'Submitting...' : 'Add Comment'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Sidebar - Right Column (4/12) */}
        <div className="col-md-4">
          {/* Ticket Status Card */}
          <div className="card mb-4">
            <div className="card-header">
              <h3 className="h5 mb-0">Actions</h3>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Update Status:</label>
                <div className="btn-group d-flex flex-wrap">
                  {ticketStatusEnum.enumValues.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`btn ${
                        ticket.status === status ? 'btn-primary' : 'btn-outline-secondary'
                      } mb-2 me-2`}
                      onClick={() => handleStatusChange(status)}
                      disabled={ticket.status === status || loading}
                    >
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <hr />
              <div className="d-grid gap-2">
                <Link href={`/tickets/${ticket.id}/edit`} className="btn btn-secondary">
                  Edit Ticket
                </Link>
              </div>
            </div>
          </div>

          {/* Ticket Info Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="h5 mb-0">Ticket Information</h3>
            </div>
            <div className="card-body">
              <table className="table table-sm">
                <tbody>
                  <tr>
                    <th>Assignee:</th>
                    <td>{ticket.assignee?.name || 'Unassigned'}</td>
                  </tr>
                  <tr>
                    <th>Reporter:</th>
                    <td>{ticket.reporter?.name || ticket.senderName || ticket.senderEmail || 'Unknown'}</td>
                  </tr>
                  <tr>
                    <th>Created:</th>
                    <td>{format(new Date(ticket.createdAt), 'PPp')}</td>
                  </tr>
                  <tr>
                    <th>Updated:</th>
                    <td>{format(new Date(ticket.updatedAt), 'PPp')}</td>
                  </tr>
                  <tr>
                    <th>Priority:</th>
                    <td>
                      <span className={getPriorityClass(ticket.priority)}>{ticket.priority}</span>
                    </td>
                  </tr>
                  {ticket.type && (
                    <tr>
                      <th>Type:</th>
                      <td>{ticket.type}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Can add more ticket info cards here if needed */}
        </div>
      </div>
    </div>
  );
} 