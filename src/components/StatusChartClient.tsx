'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

// Chart colors
const chartColors = [
  'rgba(75, 192, 192, 0.6)',  // Open - Teal
  'rgba(54, 162, 235, 0.6)',  // In Progress - Blue
  'rgba(153, 102, 255, 0.6)', // Resolved - Purple
  'rgba(201, 203, 207, 0.6)'  // Closed - Gray
];

interface Ticket {
  status: string;
}

interface ChartContext {
  label: string;
  parsed: number;
  dataset: {
    label: string;
    data: number[];
  };
}

const StatusChartClient: React.FC = () => {
  const [chartData, setChartData] = useState<{
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string[];
      borderColor: string[];
      borderWidth: number;
    }[];
  }>({
    labels: [],
    datasets: [
      {
        label: 'Tickets by Status',
        data: [],
        backgroundColor: chartColors,
        borderColor: chartColors.map(color => color.replace('0.6', '1')),
        borderWidth: 1
      }
    ]
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get('/api/tickets');
        const tickets: Ticket[] = response.data;

        // Count tickets by status
        const statusCounts: { [key: string]: number } = {};
        
        tickets.forEach(ticket => {
          const status = ticket.status;
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        // Prepare chart data
        const statuses = Object.keys(statusCounts);
        const counts = statuses.map(status => statusCounts[status]);

        setChartData({
          labels: statuses,
          datasets: [
            {
              label: 'Tickets by Status',
              data: counts,
              backgroundColor: chartColors.slice(0, statuses.length),
              borderColor: chartColors.slice(0, statuses.length).map(color => color.replace('0.6', '1')),
              borderWidth: 1
            }
          ]
        });
      } catch (err) {
        console.error('Error fetching tickets for chart:', err);
        setError('Failed to load chart data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTickets();
  }, []);

  if (isLoading) {
    return <div>Loading chart data...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div className="card">
      <div className="card-header">
        <h5>Tickets by Status</h5>
      </div>
      <div className="card-body">
        <div style={{ height: '300px', width: '100%' }}>
          <Pie
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'right'
                },
                tooltip: {
                  callbacks: {
                    label: function(context: ChartContext) {
                      const label = context.label || '';
                      const value = context.parsed || 0;
                      const dataset = context.dataset;
                      const total = dataset.data.reduce((acc: number, data: number) => acc + data, 0);
                      const percentage = Math.round((value / total) * 100);
                      return `${label}: ${value} (${percentage}%)`;
                    }
                  }
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default StatusChartClient; 