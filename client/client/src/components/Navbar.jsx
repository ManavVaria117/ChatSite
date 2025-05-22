import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css'; // We'll create this CSS file next

const Navbar = () => {
  const location = useLocation();
  const isAuthenticated = !!localStorage.getItem('token');

  // Don't show the navbar on the auth page
  if (location.pathname === '/auth' || !isAuthenticated) {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/users" className="navbar-brand">ChatApp</Link> {/* Your app title/logo */}
        <ul className="nav-links">
          {/* Add more navigation links here as needed */}
          <li>
            <Link to="/users" className="nav-link">Users</Link>
          </li>
          {/* You might add a link to user details or a logout button here */}
          <li>
            <Link to="/details" className="nav-link">My Details</Link>
          </li>
          <li>
             {/* Example Logout Button - you'll need to implement the logout logic */}
             <button
               onClick={() => {
                 localStorage.removeItem('token');
                 window.location.href = '/auth'; // Simple redirect to auth page
               }}
               className="nav-link logout-button"
             >
               Logout
             </button>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;