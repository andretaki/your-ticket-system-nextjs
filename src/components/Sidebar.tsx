// src/components/Sidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation'; // For active link highlighting
import ProcessEmailsSidebarButton from './ProcessEmailsSidebarButton';

export default function Sidebar() {
    const { data: session, status } = useSession();
    const pathname = usePathname();

    const isAdmin = status === 'authenticated' && session?.user?.role === 'admin';
    const isAuthenticated = status === 'authenticated';
    // const isEmployee = status === 'authenticated' && (session?.user?.role === 'manager' || session?.user?.role === 'user');

    // Helper function to determine if a link is active
    const isActive = (href: string) => pathname === href;

    if (status === 'loading') {
        return (
            <nav className="col-md-2 d-none d-md-block bg-light sidebar pt-3">
                <div className="text-center p-2">Loading...</div>
            </nav>
        ); // Or a more sophisticated loading skeleton
    }

    return (
        <nav className="col-md-2 d-none d-md-block bg-light sidebar">
            <div className="text-center py-3"> {/* Adjusted padding */}
                <Link href="/" className="navbar-brand mx-auto"> {/* Centering brand */}
                    {/* Optional: Replace with your actual logo component if you have one */}
                    <Image src="/assets/logo.png" alt="Logo" width={40} height={40} className="d-inline-block align-text-top me-2" />
                    <span className="fw-bold">Ticket System</span> {/* Added fw-bold */}
                </Link>
            </div>
            <ul className="nav flex-column">
                {!isAuthenticated ? (
                    <>
                        <li className="nav-item">
                            <Link href="/auth/signin" className={`nav-link ${isActive('/auth/signin') ? 'active fw-bold' : ''}`}>
                                <i className="fas fa-sign-in-alt"></i>
                                Sign In
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link href="/auth/register" className={`nav-link ${isActive('/auth/register') ? 'active fw-bold' : ''}`}>
                                <i className="fas fa-user-plus"></i>
                                Register
                            </Link>
                        </li>
                    </>
                ) : (
                    <>
                        <li className="nav-item">
                            <Link href="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active fw-bold' : ''}`}>
                                <i className="fas fa-home"></i>
                                Dashboard
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link href="/tickets" className={`nav-link ${isActive('/tickets') || pathname.startsWith('/tickets/view') || pathname.startsWith('/tickets/edit') ? 'active fw-bold' : ''}`}>
                                <i className="fas fa-list-alt"></i>
                                All Tickets
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link href="/tickets/create" className={`nav-link ${isActive('/tickets/create') ? 'active fw-bold' : ''}`}>
                                <i className="fas fa-plus-circle"></i>
                                Create Ticket
                            </Link>
                        </li>
                        
                        {/* Email Processing Button for all authenticated users */}
                        <li className="nav-item px-3">
                            <ProcessEmailsSidebarButton />
                        </li>

                        {/* Admin Specific Links */}
                        {isAdmin && (
                            <>
                                <hr className="my-2" /> {/* Optional separator */}
                                <li className="nav-item-header px-3 mt-1 mb-1 text-muted small text-uppercase">Admin Tools</li> {/* Header for admin section */}
                                <li className="nav-item">
                                    <Link href="/manage-users" className={`nav-link ${isActive('/manage-users') ? 'active fw-bold' : ''}`}>
                                        <i className="fas fa-users-cog"></i>
                                        Manage Users
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link href="/admin/email-processing" className={`nav-link ${isActive('/admin/email-processing') ? 'active fw-bold' : ''}`}>
                                        <i className="fas fa-envelope-open-text"></i>
                                        Email Processing
                                    </Link>
                                </li>
                            </>
                        )}
                    </>
                )}
            </ul>
        </nav>
    );
}