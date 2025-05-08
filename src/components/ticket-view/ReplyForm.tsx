'use client';

import React, { FormEvent, ChangeEvent, useRef, useState, useEffect } from 'react';
import axios from 'axios';

interface CannedResponse {
  id: number;
  title: string;
  content: string;
  category?: string;
}

interface ReplyFormProps {
  ticketId: number;
  senderEmail?: string | null;
  extractedStatus?: string | null;
  extractedTracking?: string | null;
  extractedCarrier?: string | null;
  extractedShipDate?: string | null;
  extractedOrderDate?: string | null;
  orderNumber?: string | null;
  isSubmittingComment: boolean;
  newComment: string;
  setNewComment: React.Dispatch<React.SetStateAction<string>>;
  isInternalNote: boolean;
  setIsInternalNote: (value: boolean) => void;
  sendAsEmail: boolean;
  setSendAsEmail: (value: boolean) => void;
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  handleCommentSubmit: (e: FormEvent) => Promise<void>;
  insertSuggestedResponse?: () => void;
}

// Helper function for formatting file size
const formatFileSize = (bytes?: number): string => {
  if (bytes === undefined || bytes === null || bytes < 0) return '';
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Helper function for determining file icon
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

export default function ReplyForm({
  ticketId,
  senderEmail,
  extractedStatus,
  orderNumber,
  isSubmittingComment,
  newComment,
  setNewComment,
  isInternalNote,
  setIsInternalNote,
  sendAsEmail,
  setSendAsEmail,
  files,
  setFiles,
  handleCommentSubmit,
  insertSuggestedResponse
}: ReplyFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cannedResponsesList, setCannedResponsesList] = useState<CannedResponse[]>([]);
  const [isLoadingCanned, setIsLoadingCanned] = useState(true);

  // Fetch canned responses
  useEffect(() => {
    const fetchCannedResponses = async () => {
      setIsLoadingCanned(true);
      try {
        const res = await axios.get<CannedResponse[]>('/api/canned-responses');
        setCannedResponsesList(res.data);
      } catch (err) {
        console.error("Failed to fetch canned responses:", err);
        // Don't block the whole UI, just log error
      } finally {
        setIsLoadingCanned(false);
      }
    };
    fetchCannedResponses();
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Append new files, consider limits
      const currentFiles = files.length;
      const newFiles = Array.from(e.target.files);
      
      // Basic limit check example
      if (currentFiles + newFiles.length > 5) {
        // This would normally set an error state that's displayed elsewhere
        if (fileInputRef.current) fileInputRef.current.value = ''; // Clear input
        return;
      }
      
      setFiles((prevFiles: File[]) => [...prevFiles, ...newFiles]);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setFiles((prevFiles: File[]) => prevFiles.filter((_, index) => index !== indexToRemove));
    if (files.length === 1 && fileInputRef.current) { // Clear input value if removing the last file
      fileInputRef.current.value = '';
    }
  };

  // Handle canned response selection
  const handleCannedResponseSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    const selectedContent = e.target.value;
    if (selectedContent) {
      // Append to existing comment or replace, depending on preference
      setNewComment((prev: string) => prev ? `${prev}\n\n${selectedContent}` : selectedContent);
      // Reset the dropdown visually
      e.target.value = "";
    }
  };

  // Determine button text based on state
  const getButtonText = () => {
    if (isSubmittingComment) return (
      <><span className="spinner-border spinner-border-sm me-2"></span>Submitting...</>
    );
    if (isInternalNote) return (
      <><i className="fas fa-lock me-1"></i> Save Note</>
    );
    if (sendAsEmail) return (
      <><i className="fas fa-paper-plane me-1"></i> Send Email</>
    );
    return (
      <><i className="fas fa-reply me-1"></i> Reply</>
    );
  };

  return (
    <div className="reply-form-container border rounded mb-4">
      <div className="reply-form-header d-flex justify-content-between align-items-center p-2 bg-light border-bottom">
        <div className="reply-title">
          <strong><i className="fas fa-reply me-1"></i> Reply</strong>
        </div>
        
        <div className="reply-actions d-flex gap-2">
          {/* Canned Responses Dropdown */}
          <div className="d-flex align-items-center">
            <select
              id="cannedResponseSelect"
              className="form-select form-select-sm"
              onChange={handleCannedResponseSelect}
              value=""
              disabled={isLoadingCanned || isSubmittingComment}
            >
              <option value="" disabled={isLoadingCanned}>
                {isLoadingCanned ? 'Loading responses...' : '-- Insert template --'}
              </option>
              {cannedResponsesList.map(resp => (
                <option key={resp.id} value={resp.content}>
                  {resp.title}
                </option>
              ))}
            </select>
          </div>
          
          {/* Status Reply Button (if available) */}
          {orderNumber && extractedStatus && ['shipped', 'awaiting_shipment', 'processing'].includes(extractedStatus) && insertSuggestedResponse && (
            <button 
              type="button" 
              className="btn btn-sm btn-outline-info" 
              onClick={insertSuggestedResponse} 
              title="Insert suggested reply" 
              disabled={isSubmittingComment}
            >
              <i className="fas fa-magic me-1"></i> Insert Status Reply
            </button>
          )}
        </div>
      </div>
      
      <form onSubmit={handleCommentSubmit}>
        <div className="p-3">
          {/* Text Area for Reply */}
          <div className="mb-3">
            <textarea
              className="form-control"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Type your reply here..."
              rows={6}
              readOnly={isSubmittingComment}
              style={{ minHeight: '150px', resize: 'vertical' }} 
            />
          </div>
          
          {/* File Upload Section */}
          <div className="mb-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="form-control form-control-sm"
              multiple
              disabled={isSubmittingComment}
            />
            
            {/* Selected Files List */}
            {files.length > 0 && (
              <div className="selected-files mt-2">
                {files.map((file, index) => (
                  <div key={index} className="selected-file d-flex align-items-center p-2 border rounded mb-1">
                    <i className={`fas ${getFileIconClass(file.type)} me-2 text-secondary`}></i>
                    <span className="file-name text-truncate flex-grow-1">{file.name}</span>
                    <span className="file-size text-muted small me-2">{formatFileSize(file.size)}</span>
                    <button 
                      type="button" 
                      className="btn btn-sm btn-link text-danger p-0" 
                      onClick={() => removeFile(index)}
                      disabled={isSubmittingComment}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Options and Submit Button */}
          <div className="d-flex justify-content-between align-items-center">
            <div className="reply-options d-flex gap-2">
              <div className="form-check form-switch me-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="internalNoteSwitch"
                  checked={isInternalNote}
                  onChange={e => {
                    const checked = e.target.checked;
                    setIsInternalNote(checked);
                    if (checked) setSendAsEmail(false);
                  }}
                  disabled={isSubmittingComment}
                />
                <label className="form-check-label" htmlFor="internalNoteSwitch">
                  <i className="fas fa-lock me-1"></i> Internal Note
                </label>
              </div>
              
              <div className="form-check form-switch">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="sendEmailSwitch"
                  checked={sendAsEmail}
                  onChange={e => {
                    const checked = e.target.checked;
                    setSendAsEmail(checked);
                    if (checked) setIsInternalNote(false);
                  }}
                  disabled={isInternalNote || !senderEmail || isSubmittingComment}
                />
                <label className="form-check-label" htmlFor="sendEmailSwitch">
                  <i className="fas fa-paper-plane me-1"></i> Send as Email
                </label>
              </div>
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={(!newComment || newComment.trim() === '') && files.length === 0 || isSubmittingComment}
            >
              {getButtonText()}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
} 