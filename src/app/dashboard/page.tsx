import React from 'react';
import { Metadata } from 'next';
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
      <h1 className="mb-4">Dashboard</h1>
      
      {/* Charts Section */}
      <div className="row mb-4">
        <div className="col-lg-4 mb-4">
          <StatusChartClient />
        </div>
        <div className="col-lg-4 mb-4">
          <PriorityChartClient />
        </div>
        <div className="col-lg-4 mb-4">
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