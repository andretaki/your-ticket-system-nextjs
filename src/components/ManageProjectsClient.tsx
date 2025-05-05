'use client'; // Mark as Client Component for hooks and interactions

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import CreateProjectClient from "./CreateProjectClient"; // Import the refactored create form

// Define the type for a Project based on your Drizzle schema
interface Project {
  id: number;
  name: string;
  description?: string | null; // Optional description
  createdAt: Date;
  updatedAt: Date;
}

// Props for the ProjectRow component
interface ProjectRowProps {
  project: Project;
  deleteProject: (id: number) => void; // Function to delete
}

const ProjectRow: React.FC<ProjectRowProps> = ({ project, deleteProject }) => (
  <tr>
    <td>{project.name}</td>
    <td>{project.description || '-'}</td> {/* Display description or dash */}
    <td>
      {/* Added confirmation dialog */}
      <button
        onClick={() => {
          if (window.confirm(`Are you sure you want to delete project "${project.name}"? This might orphan associated tickets.`)) {
            deleteProject(project.id);
          }
        }}
        className="btn btn-danger btn-sm" // Use button for better semantics
      >
        Delete
      </button>
      {/* Add Edit button/link later if needed */}
    </td>
  </tr>
);

export default function ManageProjectsClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch projects function (memoized with useCallback)
  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await axios.get<Project[]>('/api/projects'); // Use the API route
      setProjects(res.data);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects.');
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty dependency array: function is stable

  // Fetch projects on component mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]); // Depend on fetchProjects

  // Delete project function
  const deleteProject = async (id: number) => {
    try {
      await axios.delete(`/api/projects/${id}`); // Use the API route
      // Re-fetch the list after deletion
      fetchProjects();
      // Or filter locally: setProjects(currentProjects => currentProjects.filter(p => p.id !== id));
    } catch (err: any) {
      console.error('Error deleting project:', err);
      setError(err.response?.data?.error || 'Failed to delete project.');
    }
  };

  // Render logic
  if (isLoading) return <div>Loading projects...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      <h3>Manage Projects</h3>
      <table className="table table-striped table-bordered"> {/* Added some Bootstrap classes */}
        <thead className="thead-light">
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {projects.length > 0 ? (
            projects.map(currentProject => (
              <ProjectRow
                project={currentProject}
                deleteProject={deleteProject}
                key={currentProject.id}
              />
            ))
          ) : (
            <tr>
              <td colSpan={3} className="text-center">No projects found.</td>
            </tr>
          )}
        </tbody>
      </table>
      <hr /> {/* Separator */}
      <CreateProjectClient onProjectCreated={fetchProjects} /> {/* Pass refresh function */}
    </div>
  );
} 