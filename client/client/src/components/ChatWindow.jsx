import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import './ChatWindow.css'; // You'll need to create this CSS file

// Replace with your backend URL
const ENDPOINT = 'http://localhost:5000';

let socket;

// Get roomId from URL parameters
const ChatWindow = () => {
  const { roomId } = useParams();

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


  useEffect(() => {
    console.log('ChatWindow mounted for room:', roomId);

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication required.');
      setLoadingHistory(false);
      // You might want to redirect to login here
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
        setMessages(response.data);
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
         setMessages((prevMessages) => [...prevMessages, message]);
      } else {
         console.log(`Received message for room ${message.room}, but current room is ${roomId}. Ignoring.`);
      }
    });

    // --- New: Event listener for message updates (including reactions) ---
    // REMOVE the duplicate listener below
    // socket.on('receiveMessage', (message) => {
    //   console.log('New message received:', message);
    //   // Only add message if it belongs to the current room
    //   if (message.room === roomId) {
    //      setMessages((prevMessages) => [...prevMessages, message]);
    //   } else {
    //      console.log(`Received message for room ${message.room}, but current room is ${roomId}. Ignoring.`);
    //   }
    // });

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

     // --- New: Event listener for reaction errors from the server ---
     // REMOVE the duplicate listener below
    //  socket.on('receiveMessage', (message) => {
    //   console.log('New message received:', message);
    //   // Only add message if it belongs to the current room
    //   if (message.room === roomId) {
    //      setMessages((prevMessages) => [...prevMessages, message]);
    //   } else {
    //      console.log(`Received message for room ${message.room}, but current room is ${roomId}. Ignoring.`);
    //   }
    // });

    // --- End New: Event listener for reaction errors ---


    // Join the specific room
    socket.emit('joinRoom', roomId);

    // Clean up on component unmount
    return () => {
      socket.disconnect();
      console.log('Socket disconnected');
    };
  }, [roomId, currentUserId]); // Add currentUserId to dependencies

  // Scroll to the latest message whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && socket) {
      console.log(`Sending message to room ${roomId}: ${newMessage}`);
      socket.emit('sendMessage', { roomId, content: newMessage });
      setNewMessage('');
    }
  };

  if (loadingHistory) {
    return <div className="chat-window-container">Loading messages...</div>;
  }

  if (error) {
    return <div className="chat-window-container">Error: {error}</div>;
  }

  return (
    <div className="chat-window-container">
      {/* Display the determined chat name */}
      <h2>Chating room: {otherUsername} </h2>

      <div className="message-list">
        {messages.map((message, index) => (
          <div key={message._id || index} className="message">
            <span className="sender-username">{message.sender?.username || 'Unknown User'}:</span>
            <span className="message-content">{message.content}</span>
            <span className="timestamp">{new Date(message.timestamp).toLocaleTimeString()}</span>
            {/* Add reaction display and picker here later */}
          </div>
        ))}
        <div ref={messagesEndRef} /> {/* Empty div to scroll to */}
      </div>

      <form onSubmit={sendMessage} className="message-input-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Enter message..."
          className="message-input"
        />
        <button type="submit" className="send-button">Send</button>
      </form>
    </div>
  );
};

export default ChatWindow;