'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { ticketStatusEnum } from '@/db/schema';

// Register necessary Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

// Define the ticket structure expected from the API
interface TicketSummary {
  status: string;
  // Add other fields if needed for filtering, though only status is used here
}

// Get status labels from our enum and capitalize them for display
const statusValues = ticketStatusEnum.enumValues;
const labels = statusValues.map(status => 
  status.replace('_', ' ').split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
);

// Chart colors for different statuses
const backgroundColor = [
  'rgba(75, 192, 192, 0.7)',  // Open - Teal
  'rgba(54, 162, 235, 0.7)',  // In Progress - Blue
  'rgba(153, 102, 255, 0.7)', // Resolved - Purple
  'rgba(201, 203, 207, 0.7)'  // Closed - Gray
];

const options = {
  maintainAspectRatio: false,
  responsive: true,
  plugins: {
    legend: {
      position: 'right' as const,
    },
    tooltip: {
      callbacks: {
        label: function(context: any) {
          const label = context.label || '';
          const value = context.raw || 0;
          const total = context.dataset.data.reduce((acc: number, data: number) => acc + data, 0);
          const percentage = Math.round((value / total) * 100);
          return `${label}: ${value} (${percentage}%)`;
        }
      }
    }
  }
};

export default function StatusChartClient() {
  const [chartData, setChartData] = useState({
    labels: labels,
    datasets: [{
      data: Array(statusValues.length).fill(0), // Initial zeros for all statuses
      backgroundColor: backgroundColor.slice(0, statusValues.length),
      borderWidth: 1,
      hoverOffset: 4,
    }],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTicketData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await axios.get<TicketSummary[]>('/api/tickets');
      const tickets = res.data;

      // Process data
      const counts: Record<string, number> = {};
      
      // Initialize all possible statuses with 0
      statusValues.forEach(status => {
        counts[status] = 0;
      });

      // Count tickets by status
      tickets.forEach(ticket => {
        const status = ticket.status;
        counts[status] = (counts[status] || 0) + 1;
      });

      // Update chart data state with the new counts
      setChartData(prevData => ({
        ...prevData,
        datasets: [{
          ...prevData.datasets[0],
          data: statusValues.map(status => counts[status] || 0)
        }]
      }));

    } catch (err) {
      console.error('Error fetching status chart data:', err);
      setError('Could not load status chart data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTicketData();
  }, [fetchTicketData]);

  if (isLoading) return <div className="card-body text-center py-5">Loading Status Chart...</div>;
  if (error) return <div className="card-body alert alert-warning">{error}</div>;

  // Conditional rendering if no data
  const hasData = chartData.datasets[0].data.some(count => count > 0);

  return (
    <div className="card">
      <div className="card-header">
        <h5>Tickets by Status</h5>
      </div>
      <div className="card-body">
        <div style={{ height: '300px', position: 'relative' }}>
          {hasData ? (
            <Doughnut data={chartData} options={options} />
          ) : (
            <p className="text-center">No ticket data available for status chart.</p>
          )}
        </div>
      </div>
    </div>
  );
} 