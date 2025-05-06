'use client'; // This needs to be a client component to use useSession

import React from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export default function Navbar() {
    const { data: session, status } = useSession();
    const isAuthenticated = status === 'authenticated';

    return (
        <nav className="navbar navbar-light bg-light navbar-expand-lg ml-auto">
            <div className="container-fluid">
                <Link href="/" className="navbar-brand">
                    <img src="/assets/logo.png" alt="Logo" width="30" height="30" className="d-inline-block align-text-top me-2" />
                    Ticket System
                </Link>

                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                    <span className="navbar-toggler-icon"></span>
                </button>

                <div className="collapse navbar-collapse" id="navbarSupportedContent">
                    <ul className="navbar-nav ms-auto">
                        {isAuthenticated ? (
                            <>
                                <li className="nav-item">
                                    <Link href="/profile" className="nav-link">
                                        <i className="fas fa-user-circle me-1"></i>
                                        {session.user.name || session.user.email}
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <button 
                                        onClick={() => signOut({ callbackUrl: '/' })} 
                                        className="nav-link btn btn-link"
                                    >
                                        <i className="fas fa-sign-out-alt me-1"></i>
                                        Sign Out
                                    </button>
                                </li>
                            </>
                        ) : (
                            <li className="nav-item">
                                <Link href="/auth/signin" className="nav-link">
                                    <i className="fas fa-sign-in-alt me-1"></i>
                                    Sign In
                                </Link>
                            </li>
                        )}
                    </ul>
                </div>
            </div>
        </nav>
    );
} 