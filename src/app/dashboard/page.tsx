import React from 'react';
import { Metadata } from 'next';
import DashboardStatsSection from '@/components/DashboardStatsSection';
import StatusChartClient from '@/components/charts/StatusChartClient';
import PriorityChartClient from '@/components/charts/PriorityChartClient';
import TypeChartClient from '@/components/charts/TypeChartClient';
import TicketListClient from '@/components/TicketListClient';
import EmailProcessingButton from '@/components/EmailProcessingButton';

export const metadata: Metadata = {
  title: 'Dashboard - Issue Tracker',
  description: 'Overview of tickets, statuses, priorities, and types.',
};

export default function DashboardPage() {
  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h2 fw-bold text-primary mb-0">Dashboard Overview</h1>
        <button className="btn btn-outline-primary rounded-pill px-3 py-2 d-flex align-items-center">
          <i className="bi bi-arrow-clockwise me-2"></i> Refresh Data
        </button>
      </div>
      
      {/* Stats Cards Section */}
      <DashboardStatsSection />
      
      {/* Email Processing Section - Key "Outlook Beater" */}
      <div className="mb-4">
        <EmailProcessingButton />
      </div>

      {/* Charts Section */}
      <div className="row g-4 mb-4">
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 pt-3">
              <h5 className="card-title fw-semibold">Status Distribution</h5>
            </div>
            <div className="card-body">
              <StatusChartClient />
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 pt-3">
              <h5 className="card-title fw-semibold">Priority Breakdown</h5>
            </div>
            <div className="card-body">
              <PriorityChartClient />
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 pt-3">
              <h5 className="card-title fw-semibold">Issue Types</h5>
            </div>
            <div className="card-body">
              <TypeChartClient />
            </div>
          </div>
        </div>
      </div>
      
      {/* Ticket List Section */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center pt-3">
          <h5 className="card-title fw-semibold mb-0">Recent Tickets</h5>
          <a href="/tickets" className="text-decoration-none text-primary">View All</a>
        </div>
        <div className="card-body p-0">
          <TicketListClient limit={5} showSearch={false} />
        </div>
      </div>
    </div>
  );
}