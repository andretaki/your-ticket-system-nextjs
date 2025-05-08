// src/components/TicketViewClient.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef, ChangeEvent, FormEvent } from 'react';
import axios, { AxiosError } from 'axios';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { ticketPriorityEnum, ticketStatusEnum, users as usersSchema } from '@/db/schema'; // Import enums and user schema
import { InferSelectModel } from 'drizzle-orm'; // If using Drizzle types elsewhere

// Import our new components
import TicketHeaderBar from './ticket-view/TicketHeaderBar';
import TicketDescription from './ticket-view/TicketDescription';
import CommunicationHistory from './ticket-view/CommunicationHistory';
import ReplyForm from './ticket-view/ReplyForm';
import TicketDetailsSidebar from './ticket-view/TicketDetailsSidebar';
import ShippingInfoSidebar from './ticket-view/ShippingInfoSidebar';

// --- Type Definitions ---

// Type for user data (matching schema and expected API response)
type BaseUser = {
  id: string; // UUID
  name: string | null;
  email: string | null;
};

// Define User type based on schema for clarity if needed elsewhere, but BaseUser is sufficient here
type User = InferSelectModel<typeof usersSchema>;

// Type for attachment data (adjust if your API returns different fields)
export interface AttachmentData {
  id: number;
  filename?: string; // Internal storage filename
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string; // ISO string
  url?: string; // Optional direct URL if stored in cloud
  commentId?: number | null; // Added if your API returns this
  ticketId?: number | null;  // Added if your API returns this
}

// Type for comment data (matching schema and API response)
interface CommentData {
  id: number;
  commentText: string | null; // Allow null for attachment-only comments
  createdAt: string; // ISO string
  commenter: BaseUser | null;
  isInternalNote: boolean;
  isFromCustomer: boolean;
  isOutgoingReply: boolean; // Ensure this is included
  attachments?: AttachmentData[]; // Array of attachments for this comment
  externalMessageId?: string | null;
}

// Type for the main ticket data passed as props and used in state
interface TicketData {
  id: number;
  title: string;
  description: string | null;
  status: string; // Should match enum values
  priority: string; // Should match enum values
  type: string | null; // Should match enum values or be null
  assignee: BaseUser | null;
  reporter: BaseUser | null;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  orderNumber: string | null;
  trackingNumber: string | null;
  senderEmail: string | null;
  senderName: string | null;
  senderPhone?: string | null; // Make optional
  externalMessageId: string | null;
  conversationId: string | null;
  comments: CommentData[];
  attachments?: AttachmentData[]; // Attachments directly on the ticket (e.g., from initial email)
}

interface TicketViewClientProps {
  initialTicket: TicketData;
}

// --- Helper Functions ---

const getStatusClass = (status: string | null): string => {
  switch (status?.toLowerCase()) {
    case 'new': return 'badge bg-info text-dark';
    case 'open': return 'badge bg-success';
    case 'in_progress': return 'badge bg-primary';
    case 'pending_customer': return 'badge bg-warning text-dark';
    case 'closed': return 'badge bg-secondary';
    default: return 'badge bg-light text-dark border'; // Default for null or unknown
  }
};

const getPriorityClass = (priority: string | null): string => {
  switch (priority?.toLowerCase()) {
    case 'low': return 'badge bg-success';
    case 'medium': return 'badge bg-warning text-dark';
    case 'high': return 'badge bg-danger';
    case 'urgent': return 'badge bg-danger fw-bold text-white';
    default: return 'badge bg-light text-dark border'; // Default for null or unknown
  }
};

const formatFileSize = (bytes?: number): string => {
    if (bytes === undefined || bytes === null || bytes < 0) return '';
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIconClass = (mimeType?: string | null): string => {
    if (!mimeType) return 'fa-file';
    const mt = mimeType.toLowerCase();
    if (mt.startsWith('image/')) return 'fa-file-image';
    if (mt === 'application/pdf') return 'fa-file-pdf';
    if (mt.includes('word') || mt === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'fa-file-word';
    if (mt.includes('excel') || mt === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'fa-file-excel';
    if (mt.includes('powerpoint') || mt === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return 'fa-file-powerpoint';
    if (mt.includes('zip') || mt.includes('compressed') || mt.includes('archive')) return 'fa-file-archive';
    if (mt.startsWith('text/')) return 'fa-file-alt';
    return 'fa-file';
};

// --- Attachment List Component --- (Integrated for simplicity, can be separate file)
const AttachmentListDisplay: React.FC<{ attachments?: AttachmentData[], title?: string }> = ({ attachments, title }) => {
    if (!attachments || attachments.length === 0) return null;
    return (
      <div className="attachment-list">
        {title && <div className="attachment-header mb-2 text-muted small"><i className="fas fa-paperclip me-1"></i>{title} ({attachments.length})</div>}
        <div className="list-group list-group-flush">
          {attachments.map(att => (
            <a
              key={att.id}
              href={`/api/attachments/${att.id}/download`} // Ensure this API route exists
              target="_blank"
              rel="noopener noreferrer"
              className="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-1 px-0 border-0 bg-transparent"
              title={`Download ${att.originalFilename}`}
            >
              <div className="d-flex align-items-center text-truncate me-2">
                <i className={`fas ${getFileIconClass(att.mimeType)} me-2 text-primary fa-fw`}></i>
                <span className="text-truncate small">{att.originalFilename}</span>
              </div>
              <span className="badge bg-light text-dark ms-2">{formatFileSize(att.fileSize)}</span>
            </a>
          ))}
        </div>
      </div>
    );
};

// --- Main Component ---
export default function TicketViewClient({ initialTicket }: TicketViewClientProps) {
  const [ticket, setTicket] = useState<TicketData>(initialTicket);
  const [users, setUsers] = useState<BaseUser[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Combined loading state for simplicity
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [isUpdatingAssignee, setIsUpdatingAssignee] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comment form state
  const [newComment, setNewComment] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [sendAsEmail, setSendAsEmail] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parsed ShipStation info state
  const [extractedStatus, setExtractedStatus] = useState<string | null>(null);
  const [extractedCarrier, setExtractedCarrier] = useState<string | null>(null);
  const [extractedTracking, setExtractedTracking] = useState<string | null>(null);
  const [extractedShipDate, setExtractedShipDate] = useState<string | null>(null);
  const [extractedOrderDate, setExtractedOrderDate] = useState<string | null>(null);

  // --- Helper to safely parse date strings ---
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

  // --- Effects ---

  // Initial Load Users
  useEffect(() => {
    const fetchUsers = async () => {
      setIsUsersLoading(true);
      try {
        const res = await axios.get<BaseUser[]>('/api/users'); // Ensure API returns BaseUser compatible structure
        setUsers(res.data);
      } catch (err) {
        console.error("Failed to fetch users:", err);
        setError("Could not load assignable users.");
      } finally {
        setIsUsersLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Parse ShipStation Info from Comments
  useEffect(() => {
    const findAndParseShippingInfo = () => {
      setExtractedStatus(null); setExtractedOrderDate(null); setExtractedCarrier(null);
      setExtractedTracking(null); setExtractedShipDate(null);

      const shipStationNote = ticket.comments.find(
        comment => comment.isInternalNote && comment.commentText?.includes('**ShipStation Info for Order')
      );

      if (shipStationNote?.commentText) {
        const text = shipStationNote.commentText;
        const statusMatch = text.match(/Status:\s*([\w_]+)/i);
        const currentStatus = statusMatch ? statusMatch[1].toLowerCase() : null;
        setExtractedStatus(currentStatus);

        const orderDateMatch = text.match(/Order Date:\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
        setExtractedOrderDate(orderDateMatch ? orderDateMatch[1] : null);

        // Only parse ship date if status makes sense (e.g., shipped)
        if (currentStatus === 'shipped') {
            const shipDateMatch = text.match(/Shipped:\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
            setExtractedShipDate(shipDateMatch ? shipDateMatch[1] : null);
        }

        const carrierTrackingMatch = text.match(/Carrier:\s*([\w\s.&/-]+?),\s*Tracking:\s*([\w#.\-/]+)/i);
        if (carrierTrackingMatch) {
            setExtractedCarrier(carrierTrackingMatch[1]?.trim() || 'Unknown');
            setExtractedTracking(carrierTrackingMatch[2]?.trim());
        } else {
            const carrierMatch = text.match(/Carrier:\s*([\w\s.&/-]+)/i);
            const trackingMatch = text.match(/Tracking:\s*([\w#.\-/]+)/i);
            setExtractedCarrier(carrierMatch ? carrierMatch[1]?.trim() : 'Unknown');
            setExtractedTracking(trackingMatch ? trackingMatch[1]?.trim() : null);
        }
      }
    };
    findAndParseShippingInfo();
  }, [ticket.comments]); // Rerun only when comments change

  // Checkbox mutual exclusivity
  useEffect(() => { if (isInternalNote && sendAsEmail) setSendAsEmail(false); }, [isInternalNote, sendAsEmail]);
  useEffect(() => { if (sendAsEmail && isInternalNote) setIsInternalNote(false); }, [sendAsEmail, isInternalNote]);

  // --- Data Fetching & Updating Functions ---

  const refreshTicket = useCallback(async () => {
    // Note: This simple refresh might lose unsaved comment form state.
    // A more complex solution involves merging updates instead of full replacement.
    setIsLoading(true); setError(null);
    try {
      const response = await axios.get<TicketData>(`/api/tickets/${initialTicket.id}`);
      setTicket(response.data);
    } catch (err) {
      console.error('Failed to refresh ticket data:', err);
      setError('Could not refresh ticket data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [initialTicket.id]); // Depends only on the ID passed initially

  const handleAssigneeChange = useCallback(async (e: ChangeEvent<HTMLSelectElement>) => {
    const selectedAssigneeId = e.target.value || null;
    if (selectedAssigneeId === (ticket.assignee?.id || null)) return;

    setIsUpdatingAssignee(true); setError(null);
    const originalAssignee = ticket.assignee; // Store for potential revert

    try {
      // API Call
      await axios.put(`/api/tickets/${ticket.id}`, { assigneeId: selectedAssigneeId });
      // Refresh after successful API call
      await refreshTicket();
    } catch (err) {
      console.error('Error updating assignee:', err);
      setError(axios.isAxiosError(err) ? err.response?.data?.error || 'Failed to update assignee.' : 'Failed to update assignee.');
      // Revert UI optimistically if needed (though refresh handles it)
      setTicket(prev => ({ ...prev, assignee: originalAssignee }));
      setTimeout(() => setError(null), 6000);
    } finally {
      setIsUpdatingAssignee(false);
    }
  }, [ticket.id, ticket.assignee, refreshTicket]);

  const handleStatusSelectChange = useCallback(async (e: ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as typeof ticketStatusEnum.enumValues[number];
    if (newStatus === ticket.status) return;

    setIsUpdatingStatus(true); setError(null);
    const originalStatus = ticket.status;

    try {
      // API Call
      await axios.put(`/api/tickets/${ticket.id}`, { status: newStatus });
      // Refresh after successful API call
      await refreshTicket();
    } catch (err) {
      console.error('Error updating status:', err);
      setError(axios.isAxiosError(err) ? err.response?.data?.error || 'Failed to update status.' : 'Failed to update status.');
      // Revert UI optimistically if needed (though refresh handles it)
      setTicket(prev => ({ ...prev, status: originalStatus }));
      setTimeout(() => setError(null), 6000);
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [ticket.id, ticket.status, refreshTicket]);

  // --- Comment & Attachment Functions ---

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Append new files, consider limits
      const currentFiles = files.length;
      const newFiles = Array.from(e.target.files);
      // Basic limit check example
      if (currentFiles + newFiles.length > 5) {
         setError("Maximum 5 attachments allowed per comment.");
         if (fileInputRef.current) fileInputRef.current.value = ''; // Clear input
         return;
      }
      setFiles(prevFiles => [...prevFiles, ...newFiles]);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
    if (files.length === 1 && fileInputRef.current) { // Clear input value if removing the last file
      fileInputRef.current.value = '';
    }
  };

  const handleCommentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() && files.length === 0) {
        setError("Please enter a comment or attach a file.");
        return;
    }

    setIsSubmittingComment(true); setError(null);
    let uploadedAttachmentIds: number[] = [];

    try {
      // 1. Upload attachments
      if (files.length > 0) {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));
        try {
          const attachmentResponse = await axios.post<AttachmentData[]>(`/api/tickets/${ticket.id}/attachments`, formData);
          uploadedAttachmentIds = attachmentResponse.data.map(att => att.id);
        } catch (uploadError) {
           console.error("Attachment upload failed:", uploadError);
           setError("Failed to upload attachments. Comment not saved.");
           setIsSubmittingComment(false);
           return; // Stop if upload fails
        }
      }

      // 2. Post the reply/comment
      await axios.post(`/api/tickets/${ticket.id}/reply`, {
        content: newComment.trim() || null, // Send null if only attachments
        isInternalNote,
        sendAsEmail,
        attachmentIds: uploadedAttachmentIds,
      });

      // 3. Clear form and refresh
      setNewComment('');
      setIsInternalNote(false);
      setSendAsEmail(false);
      setFiles([]); // Clear file list state
      if (fileInputRef.current) fileInputRef.current.value = ''; // Clear file input element
      await refreshTicket();

    } catch (err) {
      console.error('Error posting comment/reply:', err);
      setError(axios.isAxiosError(err) ? err.response?.data?.error || 'Failed to post comment/reply.' : 'Failed to post comment/reply.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // --- Template/Draft Functions ---

  const isDraftReplyNote = (commentText: string | null): boolean => !!commentText && commentText.includes('**Suggested Reply');

  const extractDraftContent = (commentText: string | null): string => {
    if (!commentText) return '';
    const markerEnd = commentText.indexOf('**\n'); // Find end of the marker line
    return markerEnd !== -1 ? commentText.substring(markerEnd + 3).trim() : '';
  };

  const handleApproveAndSendDraft = useCallback(async (draftText: string) => {
    if (!ticket.senderEmail) { setError("Cannot send email: Original sender email not found."); return; }
    setIsSubmittingComment(true); setError(null);
    try {
      await axios.post(`/api/tickets/${ticket.id}/reply`, { content: draftText, isInternalNote: false, sendAsEmail: true });
      await refreshTicket();
    } catch (err) {
      console.error('Error sending draft reply:', err); setError('Failed to send the email reply.');
    } finally { setIsSubmittingComment(false); }
  }, [ticket.id, ticket.senderEmail, refreshTicket]);

  const insertSuggestedResponse = useCallback(() => {
    setError(null);
    const customerName = ticket.senderName || ticket.reporter?.name || 'Customer';
    const orderNum = ticket.orderNumber;
    if (!orderNum) { setError("Cannot generate reply: Ticket is missing the Order Number."); return; }

    let suggestedReply = '';
    const signature = "\n\nBest regards,\nAlliance Chemical Shipping Team"; // Consider making signature configurable

    switch (extractedStatus) {
      case 'shipped':
        if (!extractedOrderDate || !extractedShipDate || !extractedTracking || !extractedCarrier) {
          setError("Could not find necessary details (Order Date, Ship Date, Tracking, or Carrier) in the internal note to generate reply.");
          return;
        }
        suggestedReply = `Hi ${customerName},\n\nThank you for reaching out about order #${orderNum} (placed on **${extractedOrderDate}**).\n\nOur records show this order shipped on **${extractedShipDate}** via **${extractedCarrier}** with tracking number **${extractedTracking}**.\n\nPlease note that tracking information might no longer be available on the carrier's website for older shipments. Packages typically arrive shortly after their ship date.\n\nCould you confirm if this is the correct order number and date you were inquiring about? If you meant a different, more recent order, please provide that number.\n\nLet us know how we can further assist you.${signature}`;
        break;
      case 'awaiting_shipment':
      case 'processing':
        suggestedReply = `Hi ${customerName},\n\nThank you for contacting us about order #${orderNum}.\n\nThis order is currently processing in our warehouse queue ${extractedOrderDate ? `(placed on ${extractedOrderDate}) ` : ''}and is awaiting shipment. Orders typically ship within 1-3 business days from the order date.\n\nYou will receive a separate email with tracking information as soon as it leaves our facility.\n\nPlease let us know if you have any other questions in the meantime.${signature}`;
        break;
      default:
        setError(`Cannot generate automated reply for status "${extractedStatus || 'Unknown'}".`); return;
    }

    setNewComment(suggestedReply);
    if (ticket.senderEmail) { setSendAsEmail(true); setIsInternalNote(false); }
  }, [ticket.senderName, ticket.reporter, ticket.orderNumber, ticket.senderEmail, extractedStatus, extractedOrderDate, extractedShipDate, extractedTracking, extractedCarrier]);

  // --- Render Logic ---

  // Added initial loading check based on users loading state
  if (isUsersLoading) {
     return <div className="text-center py-5"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div></div>;
  }

  if (!ticket && !isLoading) {
      return <div className="alert alert-danger">Ticket not found or could not be loaded.</div>;
  }

  const createdAtDate = parseDate(ticket.createdAt);
  const updatedAtDate = parseDate(ticket.updatedAt);

  return (
    <div className="ticket-view-outlook container-fluid vh-100 d-flex flex-column p-0">
      {/* Error display (centralized, can be moved to header) */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show m-2" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)} aria-label="Close"></button>
        </div>
      )}
      
      {/* Ticket Header Bar (Actions, Status, Assignee) */}
      <TicketHeaderBar 
        ticket={ticket} 
        users={users} 
        isUpdatingAssignee={isUpdatingAssignee} 
        isUpdatingStatus={isUpdatingStatus} 
        handleAssigneeChange={handleAssigneeChange} 
        handleStatusSelectChange={handleStatusSelectChange}
        showAiSuggestionIndicator={!!(extractedOrderDate || extractedTracking || extractedStatus || extractedShipDate || isDraftReplyNote(ticket.comments[0]?.commentText))}
      />

      {/* Main Content Area (Scrollable) */}
      <div className="ticket-main-content row g-0 flex-grow-1">
        {/* Communication Pane (Left Side) */}
        <div className="col-lg-8 communication-pane p-3">
          {/* Description */}
          <TicketDescription ticket={ticket} />
          
          {/* Communication History */}
          <CommunicationHistory 
            comments={ticket.comments} 
            ticket={ticket} 
            handleApproveAndSendDraft={handleApproveAndSendDraft} 
            isSubmittingComment={isSubmittingComment} 
          />
          
          {/* Reply Form */}
          <ReplyForm 
            ticketId={ticket.id}
            senderEmail={ticket.senderEmail}
            extractedStatus={extractedStatus}
            extractedTracking={extractedTracking}
            extractedCarrier={extractedCarrier}
            extractedShipDate={extractedShipDate}
            extractedOrderDate={extractedOrderDate}
            orderNumber={ticket.orderNumber}
            isSubmittingComment={isSubmittingComment}
            newComment={newComment}
            setNewComment={setNewComment}
            isInternalNote={isInternalNote}
            setIsInternalNote={setIsInternalNote}
            sendAsEmail={sendAsEmail}
            setSendAsEmail={setSendAsEmail}
            files={files}
            setFiles={setFiles}
            handleCommentSubmit={handleCommentSubmit}
            insertSuggestedResponse={insertSuggestedResponse}
          />
        </div>

        {/* Details Sidebar (Right Side) */}
        <div className="col-lg-4 details-sidebar p-3 border-start">
          {/* Ticket Details */}
          <TicketDetailsSidebar 
            ticket={ticket} 
          />

          {/* AI Insights Panel - New addition */}
          {(extractedOrderDate || extractedTracking || extractedStatus || extractedShipDate) && (
            <div className="card shadow-sm mb-4 border-info border-opacity-50">
              <div className="card-header bg-info bg-opacity-10 border-info border-opacity-25">
                <h5 className="mb-0 h6 d-flex align-items-center">
                  <i className="fas fa-robot me-2 text-info"></i> AI Insights
                </h5>
              </div>
              <div className="card-body p-3">
                <div className="d-flex flex-column gap-2">
                  {extractedOrderDate && (
                    <div className="d-flex justify-content-between">
                      <span className="text-muted"><i className="fas fa-calendar-alt me-2"></i> Order Date:</span>
                      <span className="fw-medium">{extractedOrderDate}</span>
                    </div>
                  )}
                  {extractedShipDate && (
                    <div className="d-flex justify-content-between">
                      <span className="text-muted"><i className="fas fa-shipping-fast me-2"></i> Ship Date:</span>
                      <span className="fw-medium">{extractedShipDate}</span>
                    </div>
                  )}
                  {extractedStatus && (
                    <div className="d-flex justify-content-between">
                      <span className="text-muted"><i className="fas fa-info-circle me-2"></i> Status:</span>
                      <span className="fw-medium">{extractedStatus}</span>
                    </div>
                  )}
                  {extractedCarrier && extractedTracking && (
                    <div className="d-flex justify-content-between">
                      <span className="text-muted"><i className="fas fa-truck me-2"></i> Tracking:</span>
                      <span className="fw-medium">{extractedCarrier}: {extractedTracking}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Only show shipping info if we have shipping data */}
          {extractedStatus && (
            <ShippingInfoSidebar 
              extractedStatus={extractedStatus}
              extractedCarrier={extractedCarrier}
              extractedTracking={extractedTracking}
              extractedShipDate={extractedShipDate}
              extractedOrderDate={extractedOrderDate}
            />
          )}
        </div>
      </div>
    </div>
  );
}