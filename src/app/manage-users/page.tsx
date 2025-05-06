import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Manage Users - Issue Tracker',
  description: 'Admin page for managing user accounts.',
};

export default function ManageUsersPage() {
  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Manage Users</h1>
        {/* Add button or other controls later */}
      </div>
      <div className="card">
        <div className="card-body">
          <p className="text-muted">
            User management functionality will be implemented here.
            Only administrators can access this page.
          </p>
          {/* Placeholder for user list, filters, add user button etc. */}
        </div>
      </div>
    </div>
  );
} 