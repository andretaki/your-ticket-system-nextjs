'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

// Register necessary Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

// Define the ticket structure expected from the API
interface TicketSummary {
  type?: string; // Make optional since it might not be in all tickets yet
}

// Predefined ticket types - these would normally come from your schema
const typeValues = ['Bug/Error', 'Feature Request', 'Documentation', 'Question', 'Other'];

// Chart colors for different types
const backgroundColor = [
  'rgba(255, 99, 132, 0.6)',   // Bug/Error - Red
  'rgba(54, 162, 235, 0.6)',   // Feature Request - Blue
  'rgba(255, 206, 86, 0.6)',   // Documentation - Yellow
  'rgba(75, 192, 192, 0.6)',   // Question - Teal
  'rgba(153, 102, 255, 0.6)',  // Other - Purple
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

export default function TypeChartClient() {
  const [chartData, setChartData] = useState({
    labels: typeValues,
    datasets: [{
      data: Array(typeValues.length).fill(0), // Initial zeros for all types
      backgroundColor: backgroundColor.slice(0, typeValues.length),
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
      
      // Initialize all possible types with 0
      typeValues.forEach(type => {
        counts[type] = 0;
      });

      // Count tickets by type
      tickets.forEach(ticket => {
        if (ticket.type) {
          const type = ticket.type;
          if (typeValues.includes(type)) {
            counts[type]++;
          } else {
            // If it's a type we don't recognize, count it as "Other"
            counts['Other'] = (counts['Other'] || 0) + 1;
          }
        } else {
          // If ticket has no type, count it as "Other"
          counts['Other'] = (counts['Other'] || 0) + 1;
        }
      });

      // Update chart data state with the new counts
      setChartData(prevData => ({
        ...prevData,
        datasets: [{
          ...prevData.datasets[0],
          data: typeValues.map(type => counts[type] || 0)
        }]
      }));

    } catch (err) {
      console.error('Error fetching type chart data:', err);
      setError('Could not load type chart data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTicketData();
  }, [fetchTicketData]);

  if (isLoading) return <div className="card-body text-center py-5">Loading Type Chart...</div>;
  if (error) return <div className="card-body alert alert-warning">{error}</div>;

  // Conditional rendering if no data
  const hasData = chartData.datasets[0].data.some(count => count > 0);

  return (
    <div className="card">
      <div className="card-header">
        <h5>Tickets by Type</h5>
      </div>
      <div className="card-body">
        <div style={{ height: '300px', position: 'relative' }}>
          {hasData ? (
            <Pie data={chartData} options={options} />
          ) : (
            <p className="text-center">No ticket data available for type chart.</p>
          )}
        </div>
      </div>
    </div>
  );
} 