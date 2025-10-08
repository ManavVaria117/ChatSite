import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, NavLink } from 'react-router-dom';
import api from '../utils/api';
import { FaBars, FaTimes } from 'react-icons/fa';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navRef = useRef(null);
  const isAuthenticated = !!localStorage.getItem('token');
  
  // Close menu when clicking outside or route changes
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    const unlisten = () => {
      setIsMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('popstate', unlisten);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('popstate', unlisten);
    };
  }, []);
  
  // Toggle mobile menu
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Fetch username when the component mounts or isAuthenticated changes
  useEffect(() => {
    const fetchUsername = async () => {
      const token = localStorage.getItem('token');
      if (isAuthenticated && token) {
        try {
          const response = await api.get('/api/users/me');
          setUsername(response.data.username);
        } catch (error) {
          console.error('Error fetching username:', error);
          localStorage.removeItem('token');
          navigate('/auth');
        }
      } else {
        setUsername('');
      }
    };

    fetchUsername();
  }, [isAuthenticated, navigate]);

  // Don't show the navbar on the auth page or if not authenticated
  if (location.pathname === '/auth' || !isAuthenticated) {
    return null;
  }
  
  // Close menu when clicking a nav link
  const handleNavClick = () => {
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/auth');
  };

  return (
    <nav className="navbar" ref={navRef}>
      <div className="navbar-container">
        <button 
          className="menu-button" 
          onClick={toggleMenu} 
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <FaTimes /> : <FaBars />}
        </button>
        <Link to="/" className="navbar-brand" onClick={handleNavClick}>
          ChatApp
        </Link>
        <ul className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
          {username && <li className="welcome">Hello, {username}!</li>}
          <li>
            <NavLink 
              to="/users" 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              Users
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/suggestions" 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
              end
            >
              Suggestions
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/room-status" 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
              end
            >
              Room Status
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/details" 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
              end
            >
              My Details
            </NavLink>
          </li>
          <li>
            <button
              onClick={() => {
                handleLogout();
                handleNavClick();
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