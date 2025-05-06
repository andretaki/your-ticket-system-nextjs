// src/components/CreateTicketClient.tsx
'use client';

import React, { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { ticketPriorityEnum, ticketStatusEnum } from '@/db/schema';

// interface Project { // REMOVED
//   id: number;
//   name: string;
// }

interface User {
  id: number;
  name: string;
  email: string;
}

const CreateTicketClient: React.FC = () => {
  const router = useRouter();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // const [projectName, setProjectName] = useState(''); // REMOVED
  const [assigneeEmail, setAssigneeEmail] = useState<string | null>(null);
  const [priority, setPriority] = useState<string>(ticketPriorityEnum.enumValues[1]);
  const [status, setStatus] = useState<string>(ticketStatusEnum.enumValues[0]);
  
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Keep for users fetch
  
  // const [projects, setProjects] = useState<Project[]>([]); // REMOVED
  const [users, setUsers] = useState<User[]>([]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch only users now
        const usersRes = await axios.get<User[]>('/api/users');
        setUsers(usersRes.data);
        
        // Removed project fetching and default setting
      } catch (err) {
        console.error('Error loading form data (users):', err);
        setError('Failed to load users. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsSubmitting(true);
    
    try {
      const response = await axios.post('/api/tickets', {
        title,
        description,
        // projectName, // REMOVED
        assigneeEmail,
        priority,
        status
      });
      
      console.log('Ticket created:', response.data);
      router.push('/tickets');
      router.refresh();
    } catch (err: unknown) {
      console.error('Error creating ticket:', err);
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<{ error?: string, details?: Record<string, string[]> }>;
        if (axiosError.response?.data?.details) {
          const details = axiosError.response.data.details;
          const newFieldErrors: Record<string, string> = {};
          Object.entries(details).forEach(([field, messages]) => {
            newFieldErrors[field] = Array.isArray(messages) ? messages[0] : String(messages);
          });
          setFieldErrors(newFieldErrors);
        } else {
          setError(axiosError.response?.data?.error || 'Failed to create ticket. Please try again.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return <div className="text-center py-5">Loading form data...</div>;
  }
  
  return (
    <div className="card shadow-sm">
      <div className="card-header bg-light">
        <h3 className="mb-0 h5">Create New Ticket</h3>
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
          
          {/* Project Name field REMOVED */}
          {/* <div className="row">
            <div className="col-md-6 mb-3">
              <label htmlFor="project" className="form-label">Project <span className="text-danger">*</span></label>
              <select
                className={`form-select ${fieldErrors.projectName ? 'is-invalid' : ''}`}
                id="project"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.name}>{project.name}</option>
                ))}
              </select>
              {fieldErrors.projectName && <div className="invalid-feedback">{fieldErrors.projectName}</div>}
            </div>
          </div> */}
        
          <div className="mb-3"> {/* Assignee field can now take full width or be adjusted */}
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
          
          <div className="row">
            <div className="col-md-6 mb-3">
              <label htmlFor="priority" className="form-label">Priority</label>
              <select
                className="form-select"
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {ticketPriorityEnum.enumValues.map((p: string) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
            
            <div className="col-md-6 mb-3">
              <label htmlFor="status" className="form-label">Status</label>
              <select
                className="form-select"
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {ticketStatusEnum.enumValues.map((s: string) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ').charAt(0).toUpperCase() + s.replace('_', ' ').slice(1)}
                  </option>
                ))}
              </select>
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
                  Creating...
                </>
              ) : 'Create Ticket'}
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
  );
};

export default CreateTicketClient;