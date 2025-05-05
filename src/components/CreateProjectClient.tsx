'use client';

import React, { useState } from 'react';
import axios from 'axios';

// Props type for when this component needs to trigger a refresh in the parent list
interface CreateProjectProps {
  onProjectCreated: () => void; // Callback function
}

export default function CreateProjectClient({ onProjectCreated }: CreateProjectProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState(''); // Optional description
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError('Project name cannot be empty.');
      setIsSubmitting(false);
      return;
    }

    const projectData = {
      name: name.trim(),
      description: description.trim() || null, // Send null if empty
    };

    try {
      const response = await axios.post('/api/projects', projectData);
      console.log(response.data);
      setSuccess('Project successfully created!');
      setName(''); // Clear form
      setDescription('');
      onProjectCreated(); // Notify parent component to refresh the list
    } catch (err: any) {
      console.error('Error creating project:', err);
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.error || 'Failed to create project. Please try again.');
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h3>Create New Project</h3>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group mb-3"> {/* Added margin */}
          <label htmlFor="projectName">Project Name:</label> {/* Use htmlFor */}
          <input
            id="projectName" // Add id matching label htmlFor
            type="text"
            required
            className="form-control"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
         <div className="form-group mb-3"> {/* Added optional description */}
          <label htmlFor="projectDescription">Description (Optional):</label>
          <textarea
            id="projectDescription"
            className="form-control"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <div className="form-group">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
} 