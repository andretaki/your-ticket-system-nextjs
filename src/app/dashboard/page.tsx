import React from 'react';
import StatusChartClient from '@/components/charts/StatusChartClient';
import PriorityChartClient from '@/components/charts/PriorityChartClient';
import TypeChartClient from '@/components/charts/TypeChartClient';

export const metadata = {
  title: 'Dashboard - Ticket System',
};

export default function DashboardPage() {
  return (
    <div className="container mt-4">
      <h1 className="mb-4">Dashboard</h1>
      
      {/* Charts Section */}
      <div className="row mb-4">
        <div className="col-md-4 mb-4">
          <StatusChartClient />
        </div>
        <div className="col-md-4 mb-4">
          <PriorityChartClient />
        </div>
        <div className="col-md-4 mb-4">
          <TypeChartClient />
        </div>
      </div>
      
      {/* Ticket List Section */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Recent Tickets</h5>
              <a href="/tickets" className="btn btn-sm btn-primary">View All</a>
            </div>
            <div className="card-body">
              {/* This will be replaced with a TicketListClient component when it's ready */}
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Project</th>
                      <th>Assignee</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-4">
                        Loading ticket data...
                        <p className="mt-2 small">
                          <em>This will be replaced with a dynamic ticket list component.</em>
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 