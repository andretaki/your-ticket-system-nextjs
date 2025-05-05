import React from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          {/* Optional: Add a dashboard-specific navigation here if needed */}
        </div>
      </div>
      
      {children}
    </>
  );
} 