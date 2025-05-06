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
  isOutgoingReply?: boolean; // Added - Mark if this comment was sent as email
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
  senderEmail: string | null; // Email of the original sender if ticket came from email
  senderName: string | null;
  externalMessageId: string | null; // Added for threading context
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
  const [sendAsEmail, setSendAsEmail] = useState(false); // State for the new checkbox
  const [submitDisabled, setSubmitDisabled] = useState(false);

  // Keep internal note and send as email mutually exclusive
  useEffect(() => {
    if (isInternalNote && sendAsEmail) {
      setSendAsEmail(false); // If making internal, uncheck send as email
    }
  }, [isInternalNote, sendAsEmail]);
  
  useEffect(() => {
    if (sendAsEmail && isInternalNote) {
      setIsInternalNote(false); // If sending as email, uncheck internal note
    }
  }, [sendAsEmail, isInternalNote]);

  // Refresh ticket data from API
  const refreshTicket = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch using the correct type for the response
      const response = await axios.get<TicketData>(`/api/tickets/${ticket.id}`);
      // Ensure dates are correctly handled/parsed if they come back as strings
      const fetchedTicket = response.data;
      const parsedComments = fetchedTicket.comments.map(comment => ({
        ...comment,
        createdAt: typeof comment.createdAt === 'string' ? comment.createdAt : new Date(comment.createdAt).toISOString(),
      }));
      setTicket({
        ...fetchedTicket,
        createdAt: typeof fetchedTicket.createdAt === 'string' ? fetchedTicket.createdAt : new Date(fetchedTicket.createdAt).toISOString(),
        updatedAt: typeof fetchedTicket.updatedAt === 'string' ? fetchedTicket.updatedAt : new Date(fetchedTicket.updatedAt).toISOString(),
        comments: parsedComments,
      });
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
      // Use the new /reply endpoint
      const response = await axios.post(`/api/tickets/${ticket.id}/reply`, {
        content: newComment.trim(),
        isInternalNote,
        sendAsEmail // Send the new flag
      });
      
      console.log("Reply API response:", response.data);
      setNewComment(''); // Clear form
      setIsInternalNote(false); // Reset checkboxes
      setSendAsEmail(false);
      await refreshTicket(); // Refresh to show new comment
    } catch (err: unknown) {
      console.error('Error posting comment/reply:', err);
      let errorMessage = 'Failed to post comment/reply. Please try again.';
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<{ error?: string }>;
        errorMessage = axiosError.response?.data?.error || errorMessage;
      }
      setError(errorMessage);
    } finally {
      setSubmitDisabled(false);
    }
  };

  // Handle updating ticket status via API call
  const handleStatusChange = async (newStatus: string) => {
    // Avoid updating if already the current status or loading
    if (ticket.status === newStatus || loading) return;

    setLoading(true); // Indicate loading state specifically for status change
    setError(null);
    const originalStatus = ticket.status; // Keep original status in case of error

    try {
      // Optimistic UI update
      setTicket(prevTicket => ({...prevTicket, status: newStatus }));

      // Send ONLY the status update via PUT
      await axios.put(`/api/tickets/${ticket.id}`, { status: newStatus });
      // No need to call refreshTicket() immediately due to optimistic update,
      // unless you need other data that might change server-side simultaneously.
      console.log(`API Info: Ticket ${ticket.id} status updated to ${newStatus}.`);

    } catch (err) {
      console.error(`Error updating ticket ${ticket.id} status:`, err);
      let message = 'Failed to update status.';
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<{ error?: string }>;
        message = axiosError.response?.data?.error || message;
      }
      // Revert optimistic update on error
      setTicket(prevTicket => ({...prevTicket, status: originalStatus }));
      setError(message);
      // Optionally clear the error message after a few seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ticket-view">
      {/* Ticket Header */}
      <div className="mb-4 d-flex justify-content-between align-items-start flex-wrap">
        <div className='mb-2 me-3'> {/* Ensure title wraps correctly */}
          <h1 className="h2 mb-2">
            <span className="text-secondary">#{ticket.id}</span> {ticket.title}
          </h1>
          <div className="mb-2">
            <span className={getStatusClass(ticket.status)}>{ticket.status.replace('_', ' ')}</span>
            <span className={`${getPriorityClass(ticket.priority)} ms-2`}>{ticket.priority}</span>
            {ticket.type && <span className="badge bg-secondary ms-2">{ticket.type}</span>}
          </div>
          <p className="text-muted mb-0"> {/* Reduced margin */}
            Reported {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })} by{' '}
            {ticket.reporter?.name || ticket.senderName || ticket.senderEmail || 'Unknown'}
          </p>
        </div>
        <div className='mt-2'> {/* Add some margin top on small screens */}
          <Link href={`/tickets/${ticket.id}/edit`} className="btn btn-primary me-2">
            Edit
          </Link>
          <Link href="/tickets" className="btn btn-outline-secondary">
            Back to List
          </Link>
        </div>
      </div>

      {/* Error display centralized */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)} aria-label="Close"></button>
        </div>
      )}

      {/* Main Content */}
      <div className="row">
        {/* Ticket Details - Left Column (8/12) */}
        <div className="col-lg-8 mb-4">
          <div className="card shadow-sm">
            <div className="card-header">
              <h2 className="h5 mb-0">Ticket Details</h2>
            </div>
            <div className="card-body">
              {ticket.description ? (
                <div className="ticket-description mb-4">
                  <h3 className="h6">Description</h3>
                  <div className="bg-light p-3 rounded border" style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                    {ticket.description}
                  </div>
                </div>
              ) : (
                <p className="text-muted fst-italic">No description provided.</p>
              )}

              {(ticket.orderNumber || ticket.trackingNumber) && (
                <div className="order-details mt-4">
                  <h3 className="h6 mb-3">Order Information</h3>
                  <table className="table table-sm table-bordered"> {/* Added border */}
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
          <div className="card mt-4 shadow-sm">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h5 mb-0">Communication History</h2>
              <span className="badge bg-secondary">{ticket.comments.length}</span>
            </div>
            <div className="card-body">
              {/* Comment List */}
              {ticket.comments.length > 0 ? (
                <div className="comments-list mb-4">
                  {ticket.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className={`comment-item p-3 mb-3 border rounded ${
                        comment.isInternalNote ? 'border-warning bg-light fst-italic' :
                        comment.isOutgoingReply ? 'border-info bg-light-info' : // Style outgoing replies
                        'border-light' // Standard incoming/manual
                      }`}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="commenter d-flex align-items-center">
                          <strong>
                            {comment.commenter?.name ||
                              (comment.isFromCustomer ? 'Customer' : 'System/Agent')}
                          </strong>
                          {comment.isInternalNote && (
                            <span className="badge bg-warning text-dark ms-2">Internal Note</span>
                          )}
                          {comment.isOutgoingReply && (
                            <span className="badge bg-info text-dark ms-2" title="Sent as email"><i className="fas fa-paper-plane"></i> Sent</span>
                          )}
                          {comment.isFromCustomer && (
                            <span className="badge bg-success ms-2" title="Received via Email"><i className="fas fa-envelope"></i> Received</span>
                          )}
                        </div>
                        <small className="text-muted">
                          {format(new Date(comment.createdAt), 'PPp')}
                        </small>
                      </div>
                      <div className="comment-text" style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                        {comment.commentText}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted fst-italic">No comments yet.</p>
              )}

              {/* Add Comment Form */}
              <form onSubmit={handleCommentSubmit} className="mt-4 border-top pt-3">
                <div className="mb-3">
                  <label htmlFor="commentText" className="form-label fw-bold">
                    Add a Comment / Reply
                  </label>
                  <textarea
                    id="commentText"
                    className="form-control"
                    rows={4}
                    value={newComment}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewComment(e.target.value)}
                    placeholder="Type your comment here..."
                    required
                  ></textarea>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="form-check form-check-inline">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="internalNoteCheck"
                        checked={isInternalNote}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsInternalNote(e.target.checked)}
                        disabled={sendAsEmail} // Disable if sending email
                      />
                      <label className="form-check-label" htmlFor="internalNoteCheck">
                        Internal note
                      </label>
                    </div>
                    {ticket.senderEmail && ( // Only show 'Send as Email' if there's a sender email
                      <div className="form-check form-check-inline">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="sendAsEmailCheck"
                          checked={sendAsEmail}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSendAsEmail(e.target.checked)}
                          disabled={isInternalNote} // Disable if internal note
                        />
                        <label className="form-check-label" htmlFor="sendAsEmailCheck">
                          Send as Email
                        </label>
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitDisabled || !newComment.trim()}
                  >
                    {submitDisabled ? 'Submitting...' : (sendAsEmail ? 'Send & Save' : 'Save Comment')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Sidebar - Right Column (4/12) */}
        <div className="col-lg-4">
          <div className="card shadow-sm mb-4">
            <div className="card-header">
              <h3 className="h5 mb-0">Actions</h3>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Update Status:</label>
                <div className="btn-group d-flex flex-wrap">
                  {ticketStatusEnum.enumValues.map((statusValue) => (
                    <button
                      key={statusValue}
                      type="button"
                      className={`btn ${
                        ticket.status === statusValue ? 'btn-primary' : 'btn-outline-secondary'
                      } mb-2 me-2`}
                      onClick={() => handleStatusChange(statusValue)}
                      disabled={ticket.status === statusValue || loading}
                      style={{flexGrow: 1}} // Make buttons take up space
                    >
                      {statusValue.replace('_', ' ').charAt(0).toUpperCase() + statusValue.replace('_', ' ').slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <hr />
              <div className="d-grid gap-2">
                <Link href={`/tickets/${ticket.id}/edit`} className="btn btn-secondary">
                  <i className="fas fa-edit me-1"></i> Edit Ticket Details
                </Link>
              </div>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-header">
              <h3 className="h5 mb-0">Ticket Information</h3>
            </div>
            <div className="card-body">
              <table className="table table-sm table-borderless"> {/* Borderless for cleaner look */}
                <tbody>
                  <tr>
                    <th style={{width: '30%'}}>Assignee:</th>
                    <td>{ticket.assignee?.name || 'Unassigned'}</td>
                  </tr>
                  <tr>
                    <th>Reporter:</th>
                    <td>{ticket.reporter?.name || ticket.senderName || ticket.senderEmail || 'Unknown'}</td>
                  </tr>
                  {ticket.senderEmail && (
                    <tr>
                      <th>Sender:</th>
                      <td>{ticket.senderName ? `${ticket.senderName} <${ticket.senderEmail}>` : ticket.senderEmail}</td>
                    </tr>
                  )}
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
        </div>
      </div>
    </div>
  );
} 