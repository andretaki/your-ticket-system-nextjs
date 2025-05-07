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

interface AttachmentData {
  id: number;
  filename: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploaderId?: number;
  uploader?: BaseUser;
}

interface CommentData {
  id: number;
  commentText: string; // Ensure this matches schema column name
  createdAt: string; // Serialized Date string
  commenter: BaseUser | null; // Commenter might be null if user deleted
  isInternalNote: boolean;
  isFromCustomer: boolean;
  isOutgoingReply?: boolean; // Added - Mark if this comment was sent as email
  attachments?: AttachmentData[]; // Attachments for this comment
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
  attachments?: AttachmentData[]; // Attachments directly on the ticket
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

// Helper component to render file attachments
interface AttachmentListProps {
  attachments?: AttachmentData[];
  title?: string;
}

const AttachmentList: React.FC<AttachmentListProps> = ({ attachments, title }) => {
  if (!attachments || attachments.length === 0) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'fa-file-image';
    if (mimeType === 'application/pdf') return 'fa-file-pdf';
    if (mimeType.includes('word') || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'fa-file-word';
    if (mimeType.includes('excel') || mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'fa-file-excel';
    if (mimeType.includes('powerpoint') || mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return 'fa-file-powerpoint';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'fa-file-archive';
    return 'fa-file';
  };

  return (
    <div className="attachment-list mb-3">
      {title && <div className="attachment-header mb-2 text-muted"><i className="fas fa-paperclip me-1"></i>{title}</div>}
      <div className="list-group">
        {attachments.map(attachment => (
          <a
            key={attachment.id}
            href={`/api/attachments/${attachment.id}/download`}
            className="list-group-item list-group-item-action d-flex align-items-center"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i className={`fas ${getFileIcon(attachment.mimeType)} text-primary me-2`}></i>
            <div className="flex-grow-1 text-truncate">
              {attachment.originalFilename}
              <small className="d-block text-muted">
                {formatFileSize(attachment.fileSize)} • {format(new Date(attachment.uploadedAt), 'PP')}
              </small>
            </div>
            <i className="fas fa-download ms-2"></i>
          </a>
        ))}
      </div>
    </div>
  );
};

export default function TicketViewClient({ initialTicket }: TicketViewClientProps) {
  const [ticket, setTicket] = useState<TicketData>(initialTicket);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [sendAsEmail, setSendAsEmail] = useState(false); // State for the new checkbox
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const [files, setFiles] = useState<File[]>([]); // State for file attachments
  
  // File input reference
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  // Function to clear file input
  const clearFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setFiles([]);
  };

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
    if (!newComment.trim() && files.length === 0) return;

    setSubmitDisabled(true);
    setError(null);

    try {
      // If we have files to upload, handle them first
      let newAttachments: AttachmentData[] = [];
      if (files.length > 0) {
        const formData = new FormData();
        files.forEach(file => {
          formData.append('files', file);
        });

        // Upload attachments
        const attachmentResponse = await axios.post(
          `/api/tickets/${ticket.id}/attachments`,
          formData
        );
        newAttachments = attachmentResponse.data;
        clearFileInput();
      }

      // Now use the /reply endpoint
      const response = await axios.post(`/api/tickets/${ticket.id}/reply`, {
        content: newComment.trim(),
        isInternalNote,
        sendAsEmail, // Send the new flag
        attachmentIds: newAttachments.map(a => a.id) // Include attachment IDs if any
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

  // Helper function to determine file icon class based on MIME type
  const getFileIconClass = (mimeType?: string): string => {
    if (!mimeType) return 'fa-file';
    if (mimeType.startsWith('image/')) return 'fa-file-image';
    if (mimeType === 'application/pdf') return 'fa-file-pdf';
    if (mimeType.includes('word')) return 'fa-file-word';
    if (mimeType.includes('excel')) return 'fa-file-excel';
    if (mimeType.includes('powerpoint')) return 'fa-file-powerpoint';
    if (mimeType.includes('zip') || mimeType.includes('archive')) return 'fa-file-archive';
    if (mimeType.startsWith('text/')) return 'fa-file-alt';
    return 'fa-file';
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

              {/* Display ticket attachments */}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <AttachmentList 
                  attachments={ticket.attachments} 
                  title="Ticket Attachments" 
                />
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
                  {ticket.comments.map((comment) => {
                    // Determine classes based on comment type
                    let itemClasses = 'comment-item p-3 mb-3 border rounded shadow-sm'; // Base classes + subtle shadow
                    let badge = null;
                    let icon = null;

                    if (comment.isInternalNote) {
                        itemClasses += ' border-warning bg-warning-subtle fst-italic'; // Lighter yellow, italic
                        badge = <span className="badge bg-warning text-dark ms-2">Internal Note</span>;
                        icon = <i className="fas fa-lock me-2 text-warning"></i>;
                    } else if (comment.isOutgoingReply) {
                        itemClasses += ' border-info bg-info-subtle'; // Lighter blue for sent
                        badge = <span className="badge bg-info text-dark ms-2" title="Sent as email"><i className="fas fa-paper-plane"></i> Sent</span>;
                        icon = <i className="fas fa-paper-plane me-2 text-info"></i>;
                    } else if (comment.isFromCustomer) {
                        itemClasses += ' border-success bg-success-subtle'; // Lighter green for received
                        badge = <span className="badge bg-success ms-2" title="Received via Email"><i className="fas fa-envelope"></i> Received</span>;
                        icon = <i className="fas fa-envelope me-2 text-success"></i>;
                    } else {
                        // Standard manual comment by an agent
                        itemClasses += ' border-light bg-white'; // Simple white background
                        icon = <i className="fas fa-user-edit me-2 text-secondary"></i>;
                    }

                    return (
                        <div key={comment.id} className={itemClasses}>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <div className="commenter d-flex align-items-center">
                                    {icon} {/* Add the icon */}
                                    <strong>
                                        {comment.commenter?.name || (comment.isFromCustomer ? 'Customer' : 'System/Agent')}
                                    </strong>
                                    {badge} {/* Display the determined badge */}
                                </div>
                                <small className="text-muted">
                                    {format(new Date(comment.createdAt), 'PPp')} {/* Use PPp for Date and Time */}
                                </small>
                            </div>
                            <div className="comment-text pt-1" style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                                {comment.commentText}
                            </div>
                            
                            {/* Display attachments for this comment */}
                            {comment.attachments && comment.attachments.length > 0 && (
                              <div className="comment-attachments mt-3">
                                <AttachmentList attachments={comment.attachments} />
                              </div>
                            )}
                        </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted fst-italic">No comments yet.</p>
              )}

              {/* Add Comment Form */}
              <form onSubmit={handleCommentSubmit} className="mt-4 border-top pt-3">
                <div className="mb-3">
                  <label htmlFor="commentText" className="form-label fw-bold">
                    Add Reply / Note
                  </label>
                  <textarea
                    id="commentText"
                    className="form-control form-control-lg"
                    rows={5}
                    value={newComment}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewComment(e.target.value)}
                    placeholder="Type your comment here..."
                  ></textarea>
                </div>

                {/* Enhanced File Attachment Section */}
                <div className="mb-3">
                  <label htmlFor="fileAttachment" className="form-label">
                    <i className="fas fa-paperclip me-1"></i> Attach Files
                  </label>
                  <input
                    type="file"
                    id="fileAttachment"
                    className="form-control form-control-sm"
                    multiple
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    disabled={submitDisabled}
                  />
                  {files.length > 0 && (
                    <div className="selected-files-preview mt-2 p-2 border rounded bg-light-subtle">
                      <small className="d-block mb-1 fw-medium text-muted">Selected files:</small>
                      <ul className="list-unstyled mb-0">
                        {Array.from(files).map((file, index) => (
                          <li key={index} className="d-flex justify-content-between align-items-center py-1 border-bottom">
                            <div className="d-flex align-items-center text-truncate">
                              <i className={`fas ${getFileIconClass(file.type)} me-2 text-primary`} style={{ fontSize: '1.1rem' }}></i>
                              <span className="text-truncate" title={file.name}>{file.name}</span>
                              <small className="ms-2 text-muted">({(file.size / 1024).toFixed(1)} KB)</small>
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger p-0"
                              style={{ lineHeight: 1, width: '24px', height: '24px' }}
                              onClick={() => {
                                const newFiles = [...files];
                                newFiles.splice(index, 1);
                                setFiles(newFiles);
                                if (fileInputRef.current && newFiles.length === 0) { // Clear input if all files removed
                                    fileInputRef.current.value = '';
                                }
                              }}
                              title="Remove file"
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <small className="form-text text-muted mt-1 d-block">
                    Max file size: 10MB. Allowed types: common images, documents, PDFs, zip.
                  </small>
                </div>

                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div className="comment-options d-flex gap-3">
                    <div className="form-check form-check-inline">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="internalNoteCheck"
                        checked={isInternalNote}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsInternalNote(e.target.checked)}
                        disabled={sendAsEmail || submitDisabled}
                      />
                      <label className="form-check-label" htmlFor="internalNoteCheck">Internal Note</label>
                    </div>
                    {ticket.senderEmail && (
                      <div className="form-check form-check-inline">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="sendAsEmailCheck"
                          checked={sendAsEmail}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSendAsEmail(e.target.checked)}
                          disabled={isInternalNote || submitDisabled}
                        />
                        <label className="form-check-label" htmlFor="sendAsEmailCheck">Send as Email</label>
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary px-4"
                    disabled={submitDisabled || (!newComment.trim() && files.length === 0)}
                  >
                    {submitDisabled ? (
                      <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Submitting...</>
                    ) : (
                      sendAsEmail ? <><i className="fas fa-paper-plane me-1"></i> Send & Save</> : <><i className="fas fa-save me-1"></i> Save Comment</>
                    )}
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
              <div className="mb-3"> {/* Assignee */}
                <strong className="d-block text-muted small text-uppercase">
                  <i className="fas fa-user-tag me-1 text-primary"></i>Assignee
                </strong>
                <span>{ticket.assignee?.name || <span className="text-muted fst-italic">Unassigned</span>}</span>
                {ticket.assignee?.email && (
                    <small className="d-block text-muted">{ticket.assignee.email}</small>
                )}
              </div>

              <div className="mb-3"> {/* Reporter */}
                <strong className="d-block text-muted small text-uppercase">
                  <i className="fas fa-user-edit me-1 text-success"></i>Reporter
                </strong>
                <span>{ticket.reporter?.name || ticket.senderName || <span className="text-muted fst-italic">Unknown</span>}</span>
                {/* Show sender email if reporter is not an internal user */}
                {(ticket.reporter?.email || ticket.senderEmail) && (
                    <small className="d-block text-muted">{ticket.reporter?.email || ticket.senderEmail}</small>
                )}
              </div>

              <div className="mb-3"> {/* Priority */}
                <strong className="d-block text-muted small text-uppercase">
                  <i className="fas fa-exclamation-triangle me-1 text-warning"></i>Priority
                </strong>
                <span className={getPriorityClass(ticket.priority)}>{ticket.priority}</span>
              </div>

              {ticket.type && ( /* Type (Optional) */
                <div className="mb-3">
                  <strong className="d-block text-muted small text-uppercase">
                    <i className="fas fa-tag me-1 text-secondary"></i>Type
                  </strong>
                  <span>{ticket.type}</span>
                </div>
              )}

              <hr className="my-3" />

              <div className="mb-3"> {/* Created At */}
                  <strong className="d-block text-muted small text-uppercase">
                      <i className="far fa-calendar-plus me-1"></i>Created
                  </strong>
                  <span title={new Date(ticket.createdAt).toLocaleString()}> {/* Tooltip with exact time */}
                      {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                  </span>
              </div>

              <div> {/* Updated At */}
                <strong className="d-block text-muted small text-uppercase">
                  <i className="far fa-calendar-check me-1"></i>Last Updated
                </strong>
                <span title={new Date(ticket.updatedAt).toLocaleString()}> {/* Tooltip with exact time */}
                  {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 