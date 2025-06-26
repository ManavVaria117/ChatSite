import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { formatTimestamp } from '../utils/formatTimestamp';
import './ChatWindow.css';

// Utility function to format timestamp in WhatsApp style
const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Format time (e.g., '10:30 AM')
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).toLowerCase();
  
  // Check if the message was sent today
  if (date.toDateString() === now.toDateString()) {
    return timeStr; // Just show time for today's messages
  } 
  // Check if the message was sent yesterday
  else if (date.toDateString() === yesterday.toDateString()) {
    return `yesterday, ${timeStr}`;
  }
  // Check if the message was sent in the last 7 days
  else if ((now - date) < (7 * 24 * 60 * 60 * 1000)) {
    return `${date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()}, ${timeStr}`;
  }
  // For older messages, show the date and time
  else {
    return `${date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })}, ${timeStr}`;
  }
};

// Replace with your backend URL
const ENDPOINT = 'http://localhost:5000';

let socket;

// Get roomId from URL parameters
const ChatWindow = () => {
  const { roomId } = useParams();
  const navigate = useNavigate(); // Initialize useNavigate

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null); // State to store current user ID
  const [otherUsername, setOtherUsername] = useState('Loading...'); // State to store the other user's username

  const messagesEndRef = useRef(null);

  // Define your pre-built chat rooms and their display names
  const prebuiltRooms = {
    'general-chat': 'General Chat',
    'sports': 'Sports Talk',
    'technology': 'Tech Discussion',
    'random': 'Random Chat',
    // Add other pre-built rooms here if you have them
  };

  // Define available emojis (you can expand this)
  const availableEmojis = ['👍', '❤️', '😂', '😢', '🙏'];

  // --- Removed: State for Reaction User List Popup ---
  // const [showReactionUsersList, setShowReactionUsersList] = useState(false);
  // const [reactionUsersList, setReactionUsersList] = useState([]);
  // const [reactionListPosition, setReactionListPosition] = useState({ x: 0, y: 0 });
  // const reactionListRef = useRef(null); // Ref for the popup element
  // --- End Removed State ---

  // --- New State for showing reaction picker ---
  const [visibleReactionPickerId, setVisibleReactionPickerId] = useState(null);
  // --- End New State ---


  useEffect(() => {
    console.log('ChatWindow mounted for room:', roomId);

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication required.');
      setLoadingHistory(false);
      // You might want to redirect to login here
      navigate('/login'); // Redirect to login if no token
      return;
    }

    // Fetch current user details to get their ID
    const fetchCurrentUser = async () => {
        try {
            const userResponse = await axios.get(`${ENDPOINT}/api/users/me`, {
                headers: { 'x-auth-token': token } // <-- Token used here
            });
            setCurrentUserId(userResponse.data._id);
        } catch (err) {
            console.error('Error fetching current user:', err);
            setError('Failed to load user details.');
            // Handle error, maybe redirect to login
            navigate('/login'); // Redirect on error
        }
    };

    fetchCurrentUser();


    // Ensure roomId is valid before fetching history and connecting socket
    if (!roomId) {
        setError('Invalid chat room ID.');
        setLoadingHistory(false);
        console.error('ChatWindow received null or undefined roomId');
        return;
    }

    // --- Modified: Determine chat name based on room type ---
    const determineChatName = async (currentUserId, roomId) => {
        // Check if it's a pre-built room
        if (prebuiltRooms[roomId]) {
            setOtherUsername(prebuiltRooms[roomId]);
        } else {
            // Assume it's a 1-on-1 chat
            if (!currentUserId || !roomId) {
                 setOtherUsername('Error');
                 return;
            }

            try {
                // Assuming roomId is in the format userId1_userId2
                const userIds = roomId.split('_');
                const otherUserId = userIds.find(id => id !== currentUserId);

                if (!otherUserId) {
                    console.error('Could not determine other user ID from room ID:', roomId);
                    setOtherUsername('Error');
                    return;
                }

                const token = localStorage.getItem('token');
                 if (!token) {
                    console.error('No token found for fetching other user details');
                    setOtherUsername('Error');
                    return;
                }

                const userResponse = await axios.get(`${ENDPOINT}/api/users/${otherUserId}`, {
                     headers: { 'x-auth-token': token }
                });
                setOtherUsername(userResponse.data.username);

            } catch (err) {
                console.error('Error fetching other user details:', err);
                setOtherUsername('Error');
            }
        }
    };

    // Call determineChatName after currentUserId is set
    if (currentUserId && roomId) {
        determineChatName(currentUserId, roomId);
    }
    // --- End Modified: Determine chat name based on room type ---


    // Fetch message history
    const fetchMessageHistory = async () => {
      try {
        const response = await axios.get(`${ENDPOINT}/api/messages/${roomId}`, {
          headers: {
            'x-auth-token': token, // <-- Token used here
          },
        });
        // Ensure messages from history also have a reactions array
        // We no longer need to populate users here as we removed the functionality
        const historyMessages = response.data.map(msg => ({
            ...msg,
            reactions: msg.reactions || []
        }));
        setMessages(historyMessages);
        setLoadingHistory(false);
      } catch (err) {
        console.error('Error fetching message history:', err);
        setError('Failed to load message history.');
        setLoadingHistory(false);
      }
    };

    fetchMessageHistory();

    // Set up Socket.IO connection
    socket = io(ENDPOINT, {
        query: { token }
    });

    // Event listener for receiving new messages
    // Keep only ONE listener for 'receiveMessage'

    socket.on('receiveMessage', (message) => {
      console.log('New message received:', message);
      // Only add message if it belongs to the current room
      if (message.room === roomId) {
         // Ensure the message object has a reactions array, even if empty
         const messageWithReactions = {
             ...message,
             reactions: message.reactions || [] // Add empty array if reactions is missing
         };
         setMessages((prevMessages) => [...prevMessages, messageWithReactions]);
      } else {
         console.log(`Received message for room ${message.room}, but current room is ${roomId}. Ignoring.`);
      }
    });

    // --- New: Event listener for message updates (including reactions) ---
    // This listener will handle updates to existing messages, like adding reactions
    socket.on('updateMessage', (updatedMessage) => {
        console.log('Message updated received:', updatedMessage); // <-- Add this log
        console.log('Updated message reactions:', updatedMessage.reactions); // <-- Add this log
        // Update the messages state with the updated message
        setMessages(prevMessages =>
            prevMessages.map(msg =>
                msg._id === updatedMessage._id ? updatedMessage : msg
            )
        );
    });
    // --- End New: Event listener for message updates ---


    // Event listener for connection errors
    socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
        setError('Failed to connect to chat server.');
    });

    // Event listener for authentication errors from the server
    socket.on('authError', (msg) => {
        console.error('Socket authentication error:', msg);
        setError('Chat authentication failed. Please log in again.');
        // You might want to clear token and redirect to login here
        localStorage.removeItem('token'); // Clear invalid token
        navigate('/login'); // Redirect to login
    });

    // Event listener for room errors from the server
     socket.on('roomError', (msg) => {
        console.error('Socket room error:', msg);
        setError(`Chat room error: ${msg}`);
    });

    // Event listener for message errors from the server
    socket.on('messageError', (msg) => {
        console.error('Socket message error:', msg);
        setError(`Message error: ${msg}`);
    });

    // Join the room after successful connection and authentication
    socket.on('connect', () => {
        console.log('Socket connected, joining room:', roomId);
        socket.emit('joinRoom', roomId);
    });


    // Clean up on component unmount
    return () => {
      console.log('ChatWindow unmounted, disconnecting socket.');
      if (socket) { // Check if socket is initialized
        socket.disconnect();
        // Remove listeners to prevent memory leaks
        socket.off('receiveMessage');
        socket.off('updateMessage');
        socket.off('connect_error');
        socket.off('authError');
        socket.off('roomError');
        socket.off('messageError');
        socket.off('connect');
      }
    };
  }, [roomId, navigate, currentUserId]); // Added dependencies

  // Scroll to the bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]); // Scroll when messages state changes

  // --- Modified useEffect for handling clicks outside the popup and scrolling ---
  useEffect(() => {
    const handleClickOutside = (event) => {
        // Check if a picker is currently visible
        if (visibleReactionPickerId !== null) {
            // Check if the click target is outside any element with the class 'message'
            // This hides the picker if you click anywhere outside a message div.
            const clickedInsideMessage = event.target.closest('.message');
            if (!clickedInsideMessage) {
                setVisibleReactionPickerId(null);
            }
        }
    };

    const handleScroll = () => {
        // Hide the picker on scroll
        if (visibleReactionPickerId !== null) {
            setVisibleReactionPickerId(null);
        }
    };

    // Add event listeners to the document body
    // Use capture phase for mousedown to ensure it runs before click handlers on elements
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('scroll', handleScroll, true); // Use capture phase for scroll

    // Clean up the event listeners
    return () => {
        document.removeEventListener('mousedown', handleClickOutside, true);
        document.removeEventListener('scroll', handleScroll, true);
    };
  }, [visibleReactionPickerId]); // Removed showReactionUsersList from dependencies
  // --- End Modified useEffect ---


  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && socket) {
      console.log('Sending message:', newMessage, 'to room:', roomId);
      socket.emit('sendMessage', { roomId, content: newMessage });
      setNewMessage('');
    }
  };

  // --- New: Function to handle toggling a reaction ---
  const handleToggleReaction = (messageId, emoji) => {
    if (!socket || !currentUserId) {
        console.error('Socket not connected or user ID not available.');
        return;
    }
    console.log(`Toggling reaction ${emoji} for message ${messageId} by user ${currentUserId}`);
    // Emit the toggleReaction event to the server
    // --- Ensure userId is included here ---
    socket.emit('toggleReaction', { messageId, emoji, userId: currentUserId });
    // --- End Ensure ---
    // Close the picker after selecting a reaction
    setVisibleReactionPickerId(null);
  };
  // --- End New: Function to handle toggling a reaction ---


  // --- Removed: Handle reaction click (replaced by handleToggleReaction) ---
  // const handleReactionClick = (messageId, emoji) => {
  //   if (socket) {
  //       console.log(`Toggling reaction ${emoji} on message ${messageId}`);
  //       // We no longer send userId here as the server doesn't store who reacted
  //       socket.emit('toggleReaction', { messageId, emoji });
  //   }
  // };
  // --- End Removed: Handle reaction click ---


  // --- Removed: Handle showing reaction users list ---
  // const handleShowReactionUsers = (users, event) => {
  //   if (users && users.length > 0) {
  //       // The users array here should already be populated user objects from the server
  //       setReactionUsersList(users);
  //       // Position the popup near the click event
  //       setReactionListPosition({ x: event.clientX, y: event.clientY });
  //       setShowReactionUsersList(true);
  //   } else {
  //       // If no users, hide the popup
  //       setShowReactionUsersList(false);
  //       setReactionUsersList([]);
  //   }
  // };
  // --- End Removed: Handle showing reaction users list ---

  // Format reactions to group by emoji and count users
  const formatReactions = (reactions) => {
    if (!reactions || !Array.isArray(reactions) || reactions.length === 0) return [];

    // Group reactions by emoji and count the number of users for each emoji
    const reactionMap = reactions.reduce((acc, reaction) => {
      if (!reaction || !reaction.emoji || !Array.isArray(reaction.users)) {
        return acc;
      }
      
      const emoji = reaction.emoji;
      const userCount = reaction.users.length;
      
      if (!acc[emoji]) {
        acc[emoji] = {
          emoji: emoji,
          count: userCount,
          users: [...(reaction.users || [])]
        };
      } else {
        // This shouldn't happen if the server groups reactions by emoji
        // But we'll handle it just in case
        acc[emoji].count += userCount;
        if (Array.isArray(reaction.users)) {
          acc[emoji].users = [...acc[emoji].users, ...reaction.users];
        }
      }
      
      return acc;
    }, {});

    // Convert the map to an array for rendering
    return Object.values(reactionMap);
  };

  if (loadingHistory) {
    return <div className="chat-window-container">Loading messages...</div>;
  }

  if (error) {
    return <div className="chat-window-container error">Error: {error}</div>;
  }

  return (
    <div className="chat-window-container">
      <div className="chat-header">
        <h2>{otherUsername}</h2>
      </div>
      <div className="message-list">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`message ${message.sender._id === currentUserId ? 'sent' : 'received'}`}
            onClick={() => setVisibleReactionPickerId(message._id)}
          >
            <div className="message-content">
              <p>{message.content}</p>
              <span className="message-time">{formatTimestamp(message.timestamp)}</span>
            </div>
            
            {/* Display Reactions */}
            <div className="message-reactions">
              {formatReactions(message.reactions || []).map((reaction) => (
                <button 
                  key={reaction.emoji}
                  className="reaction"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleReaction(message._id, reaction.emoji);
                  }}
                >
                  {reaction.emoji} {reaction.count > 0 ? reaction.count : ''}
                </button>
              ))}
            </div>
            
            {/* Reaction Picker */}
            {visibleReactionPickerId === message._id && (
              <div 
                className="reaction-picker" 
                onClick={(e) => e.stopPropagation()}
              >
                {availableEmojis.map(emoji => (
                  <span
                    key={emoji}
                    className="reaction-emoji"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleReaction(message._id, emoji);
                      setVisibleReactionPickerId(null);
                    }}
                  >
                    {emoji}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} /> {/* Element to scroll into view */}
      </div>
      <form onSubmit={handleSendMessage} className="message-input-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Enter message..."
          className="message-input"
        />
        <button type="submit" className="send-button">Send</button>
      </form>

      {/* --- Removed: Reaction Users List Popup --- */}
      {/* {showReactionUsersList && reactionUsersList.length > 0 && (
        <div
          ref={reactionListRef}
          className="reaction-users-popup"
          style={{ top: reactionListPosition.y, left: reactionListPosition.x }}
          onBlur={handleHideReactionUsers} // Hide when focus is lost
          tabIndex="-1" // Make it focusable
        >
          <h4>Reacted by:</h4>
          <ul>
            {reactionUsersList.map(user => (
              <li key={user._id}>{user.username}</li> // Assuming user object has _id and username
            ))}
          </ul>
        </div>
      )} */}
      {/* --- End Removed Reaction Users List Popup --- */}
    </div>
  );
};

export default ChatWindow;