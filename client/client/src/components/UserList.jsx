import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRoomDialog, setShowRoomDialog] = useState(false); // New state for dialog visibility
  const navigate = useNavigate();

  // Define your pre-built chat rooms
  const [prebuiltRooms, setPrebuiltRooms] = useState([]);

  useEffect(() => {
    const fetchUsersAndCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('No token found, cannot fetch users.');
          navigate('/auth');
          setLoading(false);
          return;
        }

        // Fetch current user details to get their ID
        const currentUserResponse = await axios.get('http://localhost:5000/api/users/me', {
           headers: {
             'x-auth-token': token,
           }
        });
        setCurrentUserId(currentUserResponse.data._id); // Store the current user's ID

        // Ensure and fetch prebuilt rooms (now backed by Room documents)
        try {
          const prebuiltResp = await api.get('/api/rooms/ensure-prebuilt');
          setPrebuiltRooms(prebuiltResp.data.map(r => ({ id: r._id, name: r.description || r.name })));
        } catch (e) {
          console.warn('Failed to ensure prebuilt rooms:', e);
          setPrebuiltRooms([]);
        }

        // Fetch all users
        const usersResponse = await api.get('/api/users/');

        if (Array.isArray(usersResponse.data)) {
            // Filter out the current user from the list
            // Assuming usersResponse.data contains user objects with an 'isOnline' property
            // You will need to update your backend to provide this status
            const usersWithStatus = usersResponse.data
                .filter(user => user._id !== currentUserResponse.data._id)
                // --- Placeholder: In a real app, fetch or receive real-time status ---
                // For demonstration, let's add a dummy status (e.g., alternating)
                .map((user, index) => ({
                    ...user,
                    isOnline: index % 2 === 0 // Replace with actual status from backend
                }));
            // ---------------------------------------------------------------------
            setUsers(usersWithStatus);
        } else {
            console.error('API did not return an array for users:', usersResponse.data);
            setError('Received invalid data format from server.');
            setUsers([]);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch users or current user details.');
        setLoading(false);
      }
    };

    fetchUsersAndCurrentUser();
  }, [navigate]);

  // Function to handle navigation to general chat
  const handleGeneralChatClick = () => {
    const general = prebuiltRooms.find(r => r.name.toLowerCase().includes('general'));
    if (general) {
      console.log(`Navigating to general chat room: ${general.id}`);
      navigate(`/chat/${general.id}`);
    }
  };

  // Function to handle opening the room selection dialog
  const handleOpenRoomDialog = () => {
    setShowRoomDialog(true);
  };

  // Function to handle closing the room selection dialog
  const handleCloseRoomDialog = () => {
    setShowRoomDialog(false);
  };

  // Function to handle selecting a room from the dialog
  const handleSelectRoom = (roomId) => {
    handleCloseRoomDialog(); // Close the dialog
    console.log(`Navigating to chat room: ${roomId}`);
    navigate(`/chat/${roomId}`); // Navigate to the selected room
  };

  // Function to handle navigation to 1-on-1 chat
  const handleOneToOneChatClick = async (otherUserId) => {
    if (!currentUserId) {
        console.error('Current user ID not available.');
        setError('Cannot start 1-on-1 chat: User ID not loaded.');
        return;
    }
    try {
      const token = localStorage.getItem('token');
      const resp = await api.post(`/api/rooms/direct/${otherUserId}`);
      const roomId = resp.data._id;
      console.log(`Navigating to 1-on-1 chat room: ${roomId}`);
      navigate(`/chat/${roomId}`);
    } catch (e) {
      console.error('Failed to create/get direct room:', e);
      setError('Failed to start 1-on-1 chat.');
    }
  };

  // Filter users based on the search term
  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );


  if (loading) {
    return <div>Loading users...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="user-list-container">
      <h2>Registered Users</h2>

      {/* Add the search input field */}
      <input
        type="text"
        placeholder="Search users by name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="user-search-input"
      />

      {/* Change the General Chat button to open the dialog */}
      <button onClick={handleOpenRoomDialog} className="general-chat-button">
        Join General Chat
      </button>

      {/* Use filteredUsers for rendering */}
      {Array.isArray(filteredUsers) && filteredUsers.length > 0 ? (
        <ul>
          {filteredUsers.map((user) => (
            <li key={user._id} className="user-list-item">
              <img src={user.profilePic || 'placeholder.jpg'} alt={`${user.username}'s profile`} style={{ width: '50px', height: '50px', borderRadius: '50%', marginRight: '15px' }} />
              <span>
                {user.username}
                {/* Add the status indicator span */}
                {/* The class 'online' or 'offline' is applied based on user.isOnline */}
                <span className={`user-status-indicator ${user.isOnline ? 'online' : 'offline'}`}></span>
              </span>
              <div className="chat-options">
                 <button onClick={() => handleOneToOneChatClick(user._id)} className="one-to-one-chat-button">
                   1-on-1 Chat
                 </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>{searchTerm ? 'No users found matching your search.' : 'No other users found.'}</p>
      )}

      {/* Render the room selection dialog conditionally */}
      {showRoomDialog && (
        <div className="room-dialog-overlay">
          <div className="room-dialog-content">
            <button className="dialog-close-button" onClick={handleCloseRoomDialog}>&times;</button> {/* Close button */}
            <h3>Select a Chat Room</h3>
            <ul className="room-list">
              {prebuiltRooms.map(room => (
                <li key={room.id} onClick={() => handleSelectRoom(room.id)}>
                  {room.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserList;