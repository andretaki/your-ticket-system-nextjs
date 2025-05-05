import React from 'react';
import Link from 'next/link';
import Image from 'next/image'; // Import next/image

export default function Sidebar() {
    // Basic implementation - active states will be added later
    return (
        <nav className="col-md-2 d-none d-md-block bg-light sidebar">
            <center>
                <div className="navbar-brand" style={{ padding: "10px" }}>
                    <h4>Ticket System</h4>
                </div>
            </center>
            <ul className="nav flex-column">
                <li className="nav-item">
                    <Link href="/" className="nav-link"> {/* Use href */}
                        <i className="fas fa-home"></i>
                        Dashboard Home
                    </Link>
                </li>
                <li>
                    <Link href="/tickets/create" className="nav-link"> {/* Use href */}
                        <i className="fas fa-ticket-alt"></i>
                        Submit a Ticket
                    </Link>
                </li>
                <li>
                    <Link href="/manage-users" className="nav-link"> {/* Use href */}
                        <i className="fas fa-users"></i>
                        Manage Users
                    </Link>
                </li>
                <li>
                    <Link href="/manage-projects" className="nav-link"> {/* Use href */}
                        <i className="fas fa-folder"></i>
                        Manage Projects
                    </Link>
                </li>
                <li>
                    <Link href="/admin/email-processing" className="nav-link"> {/* Use href */}
                        <i className="fas fa-envelope"></i>
                        Email Processing
                    </Link>
                </li>
            </ul>
        </nav>
    );
} 