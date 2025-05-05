'use client';

import React, { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { priorityEnum, statusEnum } from '@/db/schema';

interface Project {
  id: number;
  name: string;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  commenter: {
    id: number;
    name: string;
    email: string;
  };
}

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  project: Project;
  assignee: User | null;
  reporter: User;
  createdAt: string;
  updatedAt: string;
  comments: Comment[];
}

interface EditTicketClientProps {
  ticketId: number;
}

const EditTicketClient: React.FC<EditTicketClientProps> = ({ ticketId }) => {
  const router = useRouter();
  
  // Ticket form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectName, setProjectName] = useState('');
  const [assigneeEmail, setAssigneeEmail] = useState<string | null>(null);
  const [priority, setPriority] = useState<string>(priorityEnum.enumValues[1]);
  const [status, setStatus] = useState<string>(statusEnum.enumValues[0]);
  
  // Comment form state
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [isAddingComment, setIsAddingComment] = useState(false);
  
  // UI state
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Data for dropdowns
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Load ticket data and form options
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load ticket, projects, and users in parallel
        const [ticketRes, projectsRes, usersRes] = await Promise.all([
          axios.get<Ticket>(`/api/tickets/${ticketId}`),
          axios.get<Project[]>('/api/projects'),
          axios.get<User[]>('/api/users')
        ]);
        
        const ticket = ticketRes.data;
        
        // Set form values from ticket
        setTitle(ticket.title);
        setDescription(ticket.description);
        setProjectName(ticket.project.name);
        setAssigneeEmail(ticket.assignee?.email || null);
        setPriority(ticket.priority);
        setStatus(ticket.status);
        setComments(ticket.comments);
        
        // Set dropdown options
        setProjects(projectsRes.data);
        setUsers(usersRes.data);
      } catch (err) {
        console.error('Error loading ticket:', err);
        setError('Failed to load ticket data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [ticketId]);
  
  // Handle ticket update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsSubmitting(true);
    
    try {
      const response = await axios.put(`/api/tickets/${ticketId}`, {
        title,
        description,
        assigneeEmail,
        priority,
        status
      });
      
      console.log('Ticket updated:', response.data);
      
      // Navigate back to ticket list or stay on the same page
      router.push('/tickets');
      router.refresh(); // Refresh the page cache in Next.js
    } catch (err: unknown) {
      console.error('Error updating ticket:', err);
      
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<{ error?: string, details?: Record<string, string[]> }>;
        
        if (axiosError.response?.data?.details) {
          // Handle validation errors for specific fields
          const details = axiosError.response.data.details;
          const newFieldErrors: Record<string, string> = {};
          
          // Convert array of errors per field to single string for UI
          Object.entries(details).forEach(([field, messages]) => {
            newFieldErrors[field] = Array.isArray(messages) ? messages[0] : String(messages);
          });
          
          setFieldErrors(newFieldErrors);
        } else {
          // Generic error message
          setError(axiosError.response?.data?.error || 'Failed to update ticket. Please try again.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle adding a comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) {
      return; // Don't submit empty comments
    }
    
    setIsAddingComment(true);
    
    try {
      const response = await axios.post(`/api/tickets/${ticketId}/comments`, {
        content: newComment.trim()
      });
      
      // Add the new comment to the list
      setComments(prevComments => [...prevComments, response.data.comment]);
      
      // Clear the comment input
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment. Please try again.');
    } finally {
      setIsAddingComment(false);
    }
  };
  
  if (isLoading) {
    return <div className="text-center py-5">Loading ticket...</div>;
  }
  
  return (
    <div className="row">
      <div className="col-md-8">
        <div className="card shadow-sm mb-4">
          <div className="card-header bg-light">
            <h3 className="mb-0 h5">Edit Ticket</h3>
          </div>
          <div className="card-body">
            {error && (
              <div className="alert alert-danger alert-dismissible fade show">
                {error}
                <button type="button" className="btn-close" onClick={() => setError(null)} aria-label="Close"></button>
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="title" className="form-label">Title <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className={`form-control ${fieldErrors.title ? 'is-invalid' : ''}`}
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                {fieldErrors.title && <div className="invalid-feedback">{fieldErrors.title}</div>}
              </div>
              
              <div className="mb-3">
                <label htmlFor="description" className="form-label">Description <span className="text-danger">*</span></label>
                <textarea
                  className={`form-control ${fieldErrors.description ? 'is-invalid' : ''}`}
                  id="description"
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                ></textarea>
                {fieldErrors.description && <div className="invalid-feedback">{fieldErrors.description}</div>}
              </div>
              
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="assignee" className="form-label">Assignee</label>
                  <select
                    className={`form-select ${fieldErrors.assigneeEmail ? 'is-invalid' : ''}`}
                    id="assignee"
                    value={assigneeEmail || ''}
                    onChange={(e) => setAssigneeEmail(e.target.value || null)}
                  >
                    <option value="">Unassigned</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.email}>{user.name} ({user.email})</option>
                    ))}
                  </select>
                  {fieldErrors.assigneeEmail && <div className="invalid-feedback">{fieldErrors.assigneeEmail}</div>}
                </div>
                
                <div className="col-md-6 mb-3">
                  <div className="row">
                    <div className="col-md-6">
                      <label htmlFor="priority" className="form-label">Priority</label>
                      <select
                        className="form-select"
                        id="priority"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                      >
                        {priorityEnum.enumValues.map((p) => (
                          <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="col-md-6">
                      <label htmlFor="status" className="form-label">Status</label>
                      <select
                        className="form-select"
                        id="status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        {statusEnum.enumValues.map((s) => (
                          <option key={s} value={s}>
                            {s.replace('_', ' ').charAt(0).toUpperCase() + s.replace('_', ' ').slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="d-flex gap-2 mt-4">
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Saving...
                    </>
                  ) : 'Save Changes'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => router.push('/tickets')}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      <div className="col-md-4">
        <div className="card shadow-sm mb-4">
          <div className="card-header bg-light">
            <h3 className="mb-0 h5">Comments</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleAddComment} className="mb-4">
              <div className="mb-3">
                <label htmlFor="newComment" className="form-label">Add a Comment</label>
                <textarea
                  className="form-control"
                  id="newComment"
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Type your comment here..."
                  required
                ></textarea>
              </div>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={isAddingComment || !newComment.trim()}
              >
                {isAddingComment ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Adding...
                  </>
                ) : 'Add Comment'}
              </button>
            </form>
            
            <hr />
            
            <div className="comment-list">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="comment mb-3 pb-3 border-bottom">
                    <div className="d-flex justify-content-between">
                      <strong>{comment.commenter.name}</strong>
                      <small className="text-muted">
                        {new Date(comment.createdAt).toLocaleDateString()} {new Date(comment.createdAt).toLocaleTimeString()}
                      </small>
                    </div>
                    <p className="mb-0 mt-2">{comment.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-muted text-center fst-italic">No comments yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditTicketClient; 