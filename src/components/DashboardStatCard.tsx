'use client';

import React from 'react';
import Link from 'next/link'; // Import Link for footer

interface DashboardStatCardProps {
  title: string;
  value: string | number;
  iconClass: string; // e.g., "fas fa-ticket-alt"
  iconColorClass?: string; // e.g., 'text-primary', 'text-danger'
  footerText?: string;
  footerLink?: string; // Link for the footer
  isLoading?: boolean;
}

const DashboardStatCard: React.FC<DashboardStatCardProps> = ({
  title,
  value,
  iconClass,
  iconColorClass = 'text-secondary', // Default color for icon
  footerText,
  footerLink,
  isLoading = false,
}) => {
  return (
    <div className="card shadow-sm h-100"> {/* h-100 ensures cards in a row are same height */}
      <div className="card-body">
        <div className="d-flex align-items-center mb-2">
          <div className={`display-4 ${iconColorClass} me-3`}> {/* Larger icon */}
            <i className={iconClass}></i>
          </div>
          <div>
            <h6 className="card-subtitle text-muted text-uppercase small fw-semibold">{title}</h6> {/* Semibold and clearer */}
            {isLoading ? (
              <div className="spinner-border spinner-border-sm text-primary mt-1" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            ) : (
              <h2 className="card-title h1 mb-0 fw-bold">{value}</h2>
            )}  
          </div>
        </div>
      </div>
      {footerText && footerLink && (
        <Link href={footerLink} className="card-footer bg-light-subtle border-top-0 text-decoration-none text-muted small py-2">
          {footerText} <i className="fas fa-arrow-circle-right ms-1"></i>
        </Link>
      )}
    </div>
  );
};

export default DashboardStatCard;