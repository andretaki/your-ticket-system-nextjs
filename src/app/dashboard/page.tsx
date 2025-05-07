import React from 'react';
import { Metadata } from 'next';
import DashboardStatsSection from '@/components/DashboardStatsSection';
import StatusChartClient from '@/components/charts/StatusChartClient';
import PriorityChartClient from '@/components/charts/PriorityChartClient';
import TypeChartClient from '@/components/charts/TypeChartClient';
import TicketListClient from '@/components/TicketListClient';

export const metadata: Metadata = {
  title: 'Dashboard - Issue Tracker',
  description: 'Overview of tickets, statuses, priorities, and types.',
};

export default function DashboardPage() {
  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">Dashboard</h1>
        {/* Optional: Add a refresh button for stats/charts */}
      </div>
      
      {/* Stats Cards Section */}
      <DashboardStatsSection />
      
      {/* Charts Section */}
      <div className="row mb-4 g-3">
        <div className="col-lg-4 mb-3 mb-lg-0">
          <StatusChartClient />
        </div>
        <div className="col-lg-4 mb-3 mb-lg-0">
          <PriorityChartClient />
        </div>
        <div className="col-lg-4">
          <TypeChartClient />
        </div>
      </div>
      
      {/* Ticket List Section */}
      <div className="row">
        <div className="col-12">
          <TicketListClient limit={5} showSearch={false} />
        </div>
      </div>
    </div>
  );
} 