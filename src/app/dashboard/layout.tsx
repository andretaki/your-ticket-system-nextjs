import React from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-wrapper bg-light-subtle">
      <div className="dashboard-header p-3 mb-3 shadow-sm bg-white">
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <div className="dashboard-nav me-4">
              <ul className="nav nav-pills">
                <li className="nav-item">
                  <a className="nav-link active rounded-pill px-3 py-2" href="/dashboard">Overview</a>
                </li>
                <li className="nav-item">
                  <a className="nav-link text-secondary rounded-pill px-3 py-2" href="/dashboard/analytics">Analytics</a>
                </li>
                <li className="nav-item">
                  <a className="nav-link text-secondary rounded-pill px-3 py-2" href="/dashboard/reports">Reports</a>
                </li>
              </ul>
            </div>
          </div>
          <div>
            <button className="btn btn-outline-secondary rounded-pill border-0 me-2" title="Settings">
              <i className="bi bi-gear"></i>
            </button>
            <button className="btn btn-outline-secondary rounded-pill border-0">
              <i className="bi bi-bell"></i>
            </button>
          </div>
        </div>
      </div>
      
      {children}
    </div>
  );
}