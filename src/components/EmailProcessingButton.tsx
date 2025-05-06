'use client';

import React, { useState } from 'react';
import axios from 'axios';

interface ProcessingResult {
  message: string;
  processed: number;
  errors: number;
  errorDetails?: string[];
}

const EmailProcessingButton: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processEmails = async () => {
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post<ProcessingResult>('/api/process-emails');
      setResult(response.data);
    } catch (err: any) {
      console.error('Failed to process emails:', err);
      if (err.response?.status === 401) {
        setError('Unauthorized. Please ensure you are logged in. Automated processing should use the X-API-Key header.');
      } else {
        setError(err.response?.data?.error || 'An unexpected error occurred while processing emails.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="card shadow-sm mb-4">
      <div className="card-header bg-light d-flex justify-content-between align-items-center">
        <h3 className="mb-0 h5">Email Processing</h3>
      </div>
      <div className="card-body">
        <p className="text-muted mb-3">
          Process unread emails from the shared inbox to create new tickets. This will check for new 
          emails, create tickets for each one, and move processed emails to appropriate folders.
        </p>
        
        <button 
          onClick={processEmails} 
          disabled={isProcessing}
          className="btn btn-primary mb-3"
        >
          {isProcessing ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Processing Emails...
            </>
          ) : 'Process Emails Now'}
        </button>
        
        {error && (
          <div className="alert alert-danger">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {result && (
          <div className="mt-3">
            <div className="alert alert-info">
              <strong>Result:</strong> {result.message}
            </div>
            
            {result.errors > 0 && result.errorDetails && result.errorDetails.length > 0 && (
              <div className="mt-2">
                <h6>Error Details:</h6>
                <ul className="list-group">
                  {result.errorDetails.map((detail, index) => (
                    <li key={index} className="list-group-item text-danger">
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailProcessingButton; 