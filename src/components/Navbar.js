import React from 'react';
import Link from 'next/link'; // Import from next/link

export default function Navbar() { // Use function component convention
    return (
        <nav className="navbar navbar-light bg-light navbar-expand-lg ml-auto">
            <div className="container-fluid">
                {/* Note: Bootstrap JS functionality for collapse might need separate setup in Next.js if not working */}
                <button className="btn btn-dark d-inline-block d-lg-none ml-auto" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                    <i className="fas fa-align-justify"></i>
                </button>
                <div className="collapse navbar-collapse" id="navbarSupportedContent">
                    <ul className="navbar-nav ml-auto">
                        <li>
                            <Link href="/" className="nav-link">Log In</Link> {/* Use href */}
                        </li>
                        <li>
                            <Link href="/" className="nav-link">Sign Out</Link> {/* Use href */}
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    );
} 