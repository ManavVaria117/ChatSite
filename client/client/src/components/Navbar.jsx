import React, { useState, useEffect } from 'react'; // Import useState and useEffect
import { Link, useLocation, useNavigate } from 'react-router-dom'; // Import useNavigate
import axios from 'axios'; // Import axios
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate(); // Initialize useNavigate
  const [username, setUsername] = useState(''); // State to hold the username
  const isAuthenticated = !!localStorage.getItem('token');

  // Fetch username when the component mounts or isAuthenticated changes
  useEffect(() => {
    const fetchUsername = async () => {
      const token = localStorage.getItem('token');
      if (isAuthenticated && token) {
        try {
          const response = await axios.get('http://localhost:5000/api/users/me', {
            headers: {
              'x-auth-token': token,
            },
          });
          setUsername(response.data.username);
        } catch (error) {
          console.error('Error fetching username:', error);
          // Handle error, maybe clear token and redirect to login
          localStorage.removeItem('token');
          navigate('/auth');
        }
      } else {
        setUsername(''); // Clear username if not authenticated
      }
    };

    fetchUsername();
  }, [isAuthenticated, navigate]); // Depend on isAuthenticated and navigate

  // Don't show the navbar on the auth page or if not authenticated
  if (location.pathname === '/auth' || !isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/auth'); // Use navigate for redirect
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/users" className="navbar-brand">ChatApp</Link> {/* Your app title/logo */}
        <ul className="nav-links">
          {/* Display username if available */}
          {username && <li>Hello, {username}!</li>}
          <li>
            <Link to="/users" className="nav-link">Users</Link>
          </li>
          <li>
            <Link to="/suggestions" className="nav-link">Suggestions</Link>
          </li>
          <li>
            <Link to="/details" className="nav-link">My Details</Link>
          </li>
          <li>
             {/* Example Logout Button - you'll need to implement the logout logic */}
             <button
               onClick={handleLogout} // Use the handleLogout function
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