'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import DashboardStatCard from './DashboardStatCard';
import { ticketStatusEnum, ticketPriorityEnum } from '@/db/schema'; // Adjust path if necessary

interface TicketSummary {
  id: number;
  status: string;
  priority: string;
}

const DashboardStatsSection: React.FC = () => {
  const [activeTicketsCount, setActiveTicketsCount] = useState<number | string>('-');
  const [criticalTicketsCount, setCriticalTicketsCount] = useState<number | string>('-');
  const [newTodayCount, setNewTodayCount] = useState<number | string>('-'); // Placeholder
  const [closedTodayCount, setClosedTodayCount] = useState<number | string>('-'); // Placeholder
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeStatuses = [
    ticketStatusEnum.enumValues[0], // new
    ticketStatusEnum.enumValues[1], // open
    ticketStatusEnum.enumValues[2], // in_progress
    ticketStatusEnum.enumValues[3], // pending_customer
  ];

  const criticalPriorities = [
    ticketPriorityEnum.enumValues[2], // high
    ticketPriorityEnum.enumValues[3], // urgent
  ];

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // NOTE: For a real-world dashboard with many tickets,
      // create a dedicated API endpoint like /api/dashboard/stats
      // that performs these aggregations on the server/database side.
      // Fetching all tickets to filter client-side is inefficient at scale.
      const res = await axios.get<TicketSummary[]>('/api/tickets');
      const tickets = res.data;

      const active = tickets.filter(t => activeStatuses.includes(t.status as any)).length;
      setActiveTicketsCount(active);

      const critical = tickets.filter(t =>
        activeStatuses.includes(t.status as any) &&
        criticalPriorities.includes(t.priority as any)
      ).length;
      setCriticalTicketsCount(critical);
      
      // Placeholder: Implement logic for "New Today" & "Closed Today" if your API supports date filtering
      // For now, we'll leave them as N/A or 0
      setNewTodayCount(0); // Replace with actual count if API supports
      setClosedTodayCount(0); // Replace with actual count if API supports

    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      setError("Could not load dashboard statistics.");
      setActiveTicketsCount('N/A');
      setCriticalTicketsCount('N/A');
      setNewTodayCount('N/A');
      setClosedTodayCount('N/A');
    } finally {
      setIsLoading(false);
    }
  }, []); // Removed dependencies that cause re-fetch on filter change from here

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (error) {
    return <div className="alert alert-warning">{error}</div>;
  }

  return (
    <div className="row mb-4 g-3"> {/* Added g-3 for gutter between cards */}
      <div className="col-sm-6 col-lg-3">
        <DashboardStatCard
          title="Active Tickets"
          value={activeTicketsCount}
          iconClass="fas fa-folder-open"
          iconColorClass="text-primary"
          footerText="View all tickets"
          footerLink="/tickets"
          isLoading={isLoading}
        />
      </div>
      <div className="col-sm-6 col-lg-3">
        <DashboardStatCard
          title="Critical Priority"
          value={criticalTicketsCount}
          iconClass="fas fa-exclamation-circle"
          iconColorClass="text-danger"
          isLoading={isLoading}
        />
      </div>
      <div className="col-sm-6 col-lg-3">
        <DashboardStatCard
          title="New Today"
          value={newTodayCount}
          iconClass="fas fa-calendar-plus"
          iconColorClass="text-success"
          isLoading={isLoading}
        />
      </div>
      <div className="col-sm-6 col-lg-3">
        <DashboardStatCard
          title="Closed Today"
          value={closedTodayCount}
          iconClass="fas fa-calendar-check"
          iconColorClass="text-info"
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default DashboardStatsSection; 