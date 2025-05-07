// src/components/TicketListClient.tsx
'use client';

import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent, useRef } from 'react';
import axios, { AxiosError } from 'axios';
import Link from 'next/link';
import TicketDisplay from './TicketDisplay'; // Remove DisplayTicket import since it's not directly used
import { ticketStatusEnum, ticketPriorityEnum } from '@/db/schema';

// Type matching the flattened response from GET /api/tickets
// Ensure this matches EXACTLY what your /api/tickets GET endpoint returns per item in the array
interface TicketListEntry {
  id: number;
  title: string;
  status: string;
  priority: string;
  type?: string | null;
  createdAt: string; // Comes as ISO string from API
  updatedAt: string; // Comes as ISO string from API
  assigneeName: string | null;
  assigneeId: string | null; // User ID is text (UUID)
  assigneeEmail?: string | null; // Optional, but good to have
  reporterName: string | null;
  reporterId?: string | null; // User ID is text (UUID)
  reporterEmail?: string | null; // Optional
  description?: string | null;
  isFromEmail?: boolean;
  orderNumber?: string | null;
  trackingNumber?: string | null;
}

interface User {
  id: string; // User ID is text (UUID) as per your schema
  name: string | null;
  email: string;
}

interface TicketListClientProps {
  limit?: number;
  showSearch?: boolean; // This prop determines if filter/search bar is shown
}

// Custom type for our debounce timeout ref that includes the _searchTermPrevious property
interface DebounceTimeoutRef extends NodeJS.Timeout {}

export default function TicketListClient({ limit, showSearch = true }: TicketListClientProps) {
  const [tickets, setTickets] = useState<TicketListEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true); // For initial load & full re-fetches
  const [isApplyingFilters, setIsApplyingFilters] = useState(false); // For button state
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  // Filter states
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Sorting states
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const debounceTimeoutRef = useRef<DebounceTimeoutRef | null>(null);
  const previousSearchTermRef = useRef<string>('');
  const isInitialMount = useRef(true);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchTickets = useCallback(async () => {
    if (!isApplyingFilters) setIsLoading(true); // Show full load spinner only if not already applying filters
    setIsApplyingFilters(true); // Set loading state for the button
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (assigneeFilter) params.append('assigneeId', assigneeFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      const res = await axios.get<TicketListEntry[]>(`/api/tickets?${params.toString()}`);
      let fetchedTickets = res.data;

      // Client-side limit if 'limit' prop is passed (e.g., for dashboard recent tickets)
      // Ideally, API would handle pagination/limit for the main ticket list page
      if (limit && limit > 0 && !statusFilter && !priorityFilter && !assigneeFilter && !searchTerm.trim()) {
        fetchedTickets = fetchedTickets.slice(0, limit);
      }
      setTickets(fetchedTickets);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError('Failed to load tickets. Please try again.');
    } finally {
      setIsLoading(false);
      setIsApplyingFilters(false);
    }
  }, [statusFilter, priorityFilter, assigneeFilter, searchTerm, sortBy, sortOrder, limit]);

  // Set up real-time updates using Server-Sent Events
  useEffect(() => {
    // Only set up real-time updates if we're on the main tickets page (not limited view)
    if (!limit) {
      // Create EventSource connection
      const eventSource = new EventSource('/api/tickets/events');
      eventSourceRef.current = eventSource;

      // Listen for ticket updates
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'ticket_created' || data.type === 'ticket_updated' || data.type === 'ticket_deleted') {
          fetchTickets();
        }
      };

      // Handle connection errors
      eventSource.onerror = (error) => {
        console.error('EventSource failed:', error);
        eventSource.close();
      };

      return () => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
      };
    }
  }, [fetchTickets, limit]);

  // Initial data load (tickets & users for filters if applicable)
  useEffect(() => {
    fetchTickets(); // Call fetchTickets directly
    if (showSearch && !limit) { // Only fetch users if full controls are shown
      axios.get<User[]>('/api/users')
        .then(res => setUsers(res.data))
        .catch(err => {
          console.error("Failed to fetch users for filter dropdown:", err);
          setError(prev => prev ? `${prev} And failed to load users.` : "Failed to load users for filters.");
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Debounced search
  useEffect(() => {
    if (!showSearch || limit) return; // Only apply debounced search on the full ticket list page
    
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      // Only fetch if search term has actually changed and is not just whitespace
      if (searchTerm !== previousSearchTermRef.current) {
        fetchTickets();
      }
      previousSearchTermRef.current = searchTerm;
    }, 700) as unknown as DebounceTimeoutRef;

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchTerm, fetchTickets, showSearch, limit]);


  const deleteTicket = async (id: number) => {
    setError(null);
    try {
      await axios.delete(`/api/tickets/${id}`);
      fetchTickets(); // Refresh list
    } catch (err: unknown) {
      console.error('Error deleting ticket:', err);
      let message = 'Failed to delete ticket.';
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<{ error?: string }>;
        message = axiosError.response?.data?.error || message;
      }
      setError(message);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    fetchTickets();
  };

  const handleClearFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setAssigneeFilter('');
    setSearchTerm('');
    setSortBy('createdAt'); // Reset sort
    setSortOrder('desc');
    // Fetch tickets will be triggered by the state changes if `fetchTickets` is in useEffect deps
    // or call it explicitly if preferred after states are set.
    // To ensure all states are updated before fetch, it's safer to call fetchTickets in a subsequent useEffect
    // or pass the reset values directly to a fetch function, but for simplicity:
    // We'll rely on the useEffect watching searchTerm to trigger a fetch when it's cleared,
    // and then the explicit fetchTickets call here will use the new empty filter values.
    fetchTickets();
  };

  const handleSort = (column: string) => {
    const newSortOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortBy(column);
    setSortOrder(newSortOrder);
    // fetchTickets() will be called due to state change in its dependency array
  };

  const renderSortIcon = (column: string) => {
    if (sortBy !== column) return <i className="fas fa-sort text-muted ms-1 opacity-50"></i>;
    return sortOrder === 'desc' ? <i className="fas fa-sort-down ms-1"></i> : <i className="fas fa-sort-up ms-1"></i>;
  };

  const shouldShowControls = showSearch && !limit;

  if (isLoading && tickets.length === 0 && !error) { // Only show full page spinner on initial load
    return <div className="text-center py-5"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading tickets...</span></div></div>;
  }

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-light d-flex flex-column flex-md-row justify-content-between align-items-md-center py-2">
        <h3 className="mb-2 mb-md-0 h5">{limit ? 'Recent Tickets' : 'All Tickets'}</h3>
        {shouldShowControls && (
          <Link href="/tickets/create" className="btn btn-success btn-sm">
            <i className="fas fa-plus me-1"></i> Create New Ticket
          </Link>
        )}
      </div>
      <div className="card-body">
        {error && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            {error}
            <button type="button" className="btn-close" onClick={() => setError(null)} aria-label="Close"></button>
          </div>
        )}

        {shouldShowControls && (
          <div className="filters-bar mb-4 p-3 border rounded bg-light-subtle">
            <form onSubmit={handleFilterFormSubmit} className="row g-2 align-items-end">
              <div className="col-lg-3 col-md-6 col-12">
                <label htmlFor="search" className="form-label form-label-sm fw-medium">Search</label>
                <input
                  type="text"
                  id="search"
                  className="form-control form-control-sm"
                  placeholder="Title, Desc, Email, Order..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
              <div className="col-lg-2 col-md-3 col-sm-6">
                <label htmlFor="statusFilter" className="form-label form-label-sm fw-medium">Status</label>
                <select id="statusFilter" className="form-select form-select-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All</option>
                  {ticketStatusEnum.enumValues.map(s => (<option key={s} value={s}>{s.replace('_', ' ').charAt(0).toUpperCase() + s.replace('_', ' ').slice(1)}</option>))}
                </select>
              </div>
              <div className="col-lg-2 col-md-3 col-sm-6">
                <label htmlFor="priorityFilter" className="form-label form-label-sm fw-medium">Priority</label>
                <select id="priorityFilter" className="form-select form-select-sm" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                  <option value="">All</option>
                  {ticketPriorityEnum.enumValues.map(p => (<option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>))}
                </select>
              </div>
              <div className="col-lg-3 col-md-6 col-12">
                <label htmlFor="assigneeFilter" className="form-label form-label-sm fw-medium">Assignee</label>
                <select id="assigneeFilter" className="form-select form-select-sm" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
                  <option value="">All</option>
                  <option value="unassigned">Unassigned</option>
                  {users.map(user => (<option key={user.id} value={user.id}>{user.name || user.email}</option>))}
                </select>
              </div>
              <div className="col-lg-1 col-md-3 col-sm-6">
                <button type="submit" className="btn btn-primary btn-sm w-100" disabled={isApplyingFilters}>
                  {isApplyingFilters ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> : <i className="fas fa-filter"></i>}
                </button>
              </div>
              <div className="col-lg-1 col-md-3 col-sm-6">
                <button type="button" className="btn btn-outline-secondary btn-sm w-100" onClick={handleClearFilters} title="Clear Filters" disabled={isApplyingFilters}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="table-responsive">
          <table className="table table-hover table-striped">
            <thead className="thead-light">
              <tr>
                <th onClick={() => handleSort('id')} className="sortable-header">ID{renderSortIcon('id')}</th>
                <th onClick={() => handleSort('title')} className="sortable-header">Title{renderSortIcon('title')}</th>
                <th style={{ minWidth: '200px' }}>Description</th>
                <th onClick={() => handleSort('assignee')} className="sortable-header">Assignee{renderSortIcon('assignee')}</th>
                <th onClick={() => handleSort('priority')} className="sortable-header">Priority{renderSortIcon('priority')}</th>
                <th onClick={() => handleSort('status')} className="sortable-header">Status{renderSortIcon('status')}</th>
                <th onClick={() => handleSort('type')} className="sortable-header">Type{renderSortIcon('type')}</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isApplyingFilters && tickets.length > 0 ? ( // Show small spinner overlay during filter application
                <tr><td colSpan={8} className="text-center py-4"><div className="spinner-border spinner-border-sm text-muted" role="status"><span className="visually-hidden">Filtering...</span></div></td></tr>
              ) : !isLoading && tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-4 fst-italic">
                    No tickets match the current filters.
                  </td>
                </tr>
              ) : (
                tickets.map(ticket => (
                  <TicketDisplay
                    key={ticket.id}
                    ticket={{
                      ...ticket,
                      createdAt: new Date(ticket.createdAt), // Ensure Date objects for DisplayTicket
                      updatedAt: new Date(ticket.updatedAt),
                    }}
                    deleteTicket={deleteTicket}
                    refreshTickets={fetchTickets}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}