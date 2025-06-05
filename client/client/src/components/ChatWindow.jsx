import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { formatTimestamp } from '../utils/formatTimestamp';
import './ChatWindow.css';

// Replace with your backend URL
const ENDPOINT = 'http://localhost:5000';

let socket;

const ChatWindow = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [otherUsername, setOtherUsername] = useState('Loading...');
  const [visibleReactionPickerId, setVisibleReactionPickerId] = useState(null);
  const messagesEndRef = useRef(null);

  // Predefined rooms and emojis
  const prebuiltRooms = {
    'general-chat': 'General Chat',
    'sports': 'Sports Talk',
    'technology': 'Tech Discussion',
    'random': 'Random Chat',
  };

  const availableEmojis = ['👍', '❤️', '😂', '😢', '🙏'];

  // Fetch current user details
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication required.');
      setLoadingHistory(false);
      navigate('/login');
      return;
    }

    const fetchCurrentUser = async () => {
      try {
        const userResponse = await axios.get(`${ENDPOINT}/api/users/me`, {
          headers: { 'x-auth-token': token }
        });
        setCurrentUserId(userResponse.data._id);
      } catch (err) {
        console.error('Error fetching current user:', err);
        setError('Failed to load user details.');
        navigate('/login');
      }
    };

    fetchCurrentUser();
  }, [navigate]);

  // Determine chat name based on room type
  useEffect(() => {
    if (!currentUserId || !roomId) return;

    const determineChatName = async () => {
      if (prebuiltRooms[roomId]) {
        setOtherUsername(prebuiltRooms[roomId]);
      } else {
        try {
          const userIds = roomId.split('_');
          const otherUserId = userIds.find(id => id !== currentUserId);
          if (!otherUserId) {
            setOtherUsername('Error');
            return;
          }

          const token = localStorage.getItem('token');
          if (!token) {
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

    determineChatName();
  }, [currentUserId, roomId]);

  // Fetch message history
  useEffect(() => {
    const fetchMessageHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${ENDPOINT}/api/messages/${roomId}`, {
          headers: { 'x-auth-token': token }
        });
        setMessages(response.data);
        setLoadingHistory(false);
      } catch (err) {
        console.error('Error fetching message history:', err);
        setError('Failed to load message history.');
        setLoadingHistory(false);
      }
    };

    if (roomId) {
      fetchMessageHistory();
    }
  }, [roomId]);

  // Set up socket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !roomId) return;

    socket = io(ENDPOINT, {
      query: { token, roomId }
    });

    socket.on('receiveMessage', (message) => {
      console.log('Received new message:', message);
      if (message.room === roomId) {
        setMessages(prev => {
          // Check if message already exists to prevent duplicates
          const messageExists = prev.some(msg => msg._id === message._id);
          if (messageExists) {
            return prev.map(msg => 
              msg._id === message._id 
                ? { ...msg, ...message, reactions: message.reactions || [] }
                : msg
            );
          }
          return [...prev, { ...message, reactions: message.reactions || [] }];
        });
      }
    });

    socket.on('updateMessage', (updatedMessage) => {
      console.log('Received message update:', updatedMessage);
      setMessages(prev => {
        // Ensure reactions array exists
        const messageWithReactions = {
          ...updatedMessage,
          reactions: Array.isArray(updatedMessage.reactions) ? updatedMessage.reactions : []
        };
        
        const messageIndex = prev.findIndex(msg => msg._id === messageWithReactions._id);
        
        if (messageIndex !== -1) {
          // Update existing message while preserving any local state
          const newMessages = [...prev];
          newMessages[messageIndex] = {
            ...newMessages[messageIndex],
            ...messageWithReactions,
            reactions: messageWithReactions.reactions
          };
          return newMessages;
        } else {
          // Add new message if it doesn't exist
          return [...prev, messageWithReactions];
        }
      });
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      setError('Failed to connect to chat server.');
    });

    socket.on('authError', (msg) => {
      console.error('Socket authentication error:', msg);
      setError('Chat authentication failed. Please log in again.');
      localStorage.removeItem('token');
      navigate('/login');
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [navigate, roomId]);

  // Track the last message count to detect new messages
  const messageCountRef = useRef(0);
  const isInitialLoad = useRef(true);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    // Only scroll if:
    // 1. It's the initial load, or
    // 2. New messages were added (count increased)
    if (isInitialLoad.current || messages.length > messageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Update the message count ref
    messageCountRef.current = messages.length;
    isInitialLoad.current = false;
  }, [messages.length]); // Only depend on messages.length to prevent unnecessary re-renders

  // Handle click outside reaction picker
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (visibleReactionPickerId && !event.target.closest('.reaction-picker')) {
        setVisibleReactionPickerId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [visibleReactionPickerId]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && socket) {
      const tempId = Date.now().toString(); // Temporary ID for optimistic update
      
      // Get the current user's info from localStorage
      const currentUser = JSON.parse(localStorage.getItem('user'));
      const username = currentUser?.username || 'You';
      
      // Optimistically add the message with sender info
      const tempMessage = {
        _id: tempId,
        sender: { 
          _id: currentUserId,
          username: username
        },
        content: newMessage,
        timestamp: new Date(),
        reactions: [],
        room: roomId
      };
      
      // Add the message to the local state first for immediate feedback
      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');
      
      // Send the message to the server
      // The server will broadcast the message back with the complete sender info
      socket.emit('sendMessage', { 
        roomId, 
        content: newMessage
        // Don't need to send sender info as the server will get it from the socket
      });
    }
  };

  const handleToggleReaction = useCallback((messageId, emoji, event) => {
    event?.stopPropagation(); // Prevent event bubbling which might trigger scroll
    
    if (!socket || !currentUserId) {
      console.error('Socket not connected or user not authenticated');
      return;
    }
    
    console.log('Toggling reaction:', { messageId, emoji, currentUserId });
    
    // Optimistically update the UI immediately
    setMessages(prevMessages => 
      prevMessages.map(message => {
        if (message._id !== messageId) return message;
        
        const updatedMessage = { ...message };
        updatedMessage.reactions = Array.isArray(updatedMessage.reactions) 
          ? JSON.parse(JSON.stringify(updatedMessage.reactions)) // Deep clone
          : [];
        
        // Find the reaction for this emoji
        const reactionIndex = updatedMessage.reactions.findIndex(r => r.emoji === emoji);
        const hasReacted = reactionIndex !== -1 && 
          updatedMessage.reactions[reactionIndex].users.some(u => 
            (u && (u._id === currentUserId || u._id?._id === currentUserId)) || 
            u === currentUserId
          );
        
        if (hasReacted) {
          // Remove user's reaction
          updatedMessage.reactions[reactionIndex].users = updatedMessage.reactions[reactionIndex].users
            .filter(u => 
              (u && u._id !== currentUserId && u._id?._id !== currentUserId) && 
              u !== currentUserId
            );
          
          // Remove the reaction if no users left
          if (updatedMessage.reactions[reactionIndex].users.length === 0) {
            updatedMessage.reactions.splice(reactionIndex, 1);
          }
        } else if (reactionIndex !== -1) {
          // Add user to existing reaction
          updatedMessage.reactions[reactionIndex].users.push(currentUserId);
        } else {
          // Add new reaction
          updatedMessage.reactions.push({
            emoji,
            users: [currentUserId]
          });
        }
        
        return updatedMessage;
      })
    );
    
    // Emit the reaction change to the server
    socket.emit('toggleReaction', { 
      messageId, 
      emoji, 
      userId: currentUserId 
    });
    
    setVisibleReactionPickerId(null);
  }, [socket, currentUserId]);

  const formatReactions = useCallback((reactions) => {
    if (!reactions || !Array.isArray(reactions) || reactions.length === 0) return [];
    
    const reactionMap = {};
    
    reactions.forEach(reaction => {
      if (!reaction?.emoji) return;
      
      const emoji = reaction.emoji;
      const users = Array.isArray(reaction.users) ? reaction.users : [];
      
      if (!reactionMap[emoji]) {
        // Create a new reaction entry
        reactionMap[emoji] = {
          emoji,
          count: 0,
          users: []
        };
      }
      
      // Add unique users to this reaction
      users.forEach(user => {
        const userId = (user && (user._id?._id || user._id || user))?.toString();
        if (userId && !reactionMap[emoji].users.some(u => 
          (u?._id?._id || u?._id || u)?.toString() === userId
        )) {
          reactionMap[emoji].users.push(user);
          reactionMap[emoji].count++;
        }
      });
    });
    
    return Object.values(reactionMap);
  }, []);

  const renderReactionPicker = (messageId) => (
    <div className="reaction-picker" onClick={(e) => e.stopPropagation()}>
      {availableEmojis.map((emoji) => (
        <span 
          key={emoji} 
          className="reaction-option"
          onClick={(e) => handleToggleReaction(messageId, emoji, e)}
        >
          {emoji}
        </span>
      ))}
    </div>
  );

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
            className={`message ${message.sender?._id === currentUserId ? 'sent' : 'received'}`}
            onClick={() => setVisibleReactionPickerId(
              prevId => prevId === message._id ? null : message._id
            )}
          >
            <div className="message-sender">
              <span className="sender-username">
                {message.sender?._id === currentUserId ? 'You' : message.sender?.username || 'Unknown'}
              </span>
            </div>
            <div className="message-content">{message.content}</div>
            <div className="message-footer">
              <span className="timestamp" title={new Date(message.timestamp).toLocaleString()}>
                {formatTimestamp(message.timestamp)}
              </span>
              <div className="reactions-container">
                {formatReactions(message.reactions || []).map((reaction, idx) => {
                  const userHasReacted = reaction.users.some(u => 
                    (u && (u._id === currentUserId || u._id?._id === currentUserId)) || 
                    u === currentUserId
                  );
                  
                  return (
                    <button
                      key={`${reaction.emoji}-${idx}`}
                      className={`reaction-pill ${userHasReacted ? 'reacted' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleReaction(message._id, reaction.emoji, e);
                      }}
                      title={`${reaction.count} ${reaction.count === 1 ? 'reaction' : 'reactions'}`}
                    >
                      {reaction.emoji} {reaction.count > 0 ? reaction.count : ''}
                    </button>
                  );
                })}
              </div>
              {visibleReactionPickerId === message._id && renderReactionPicker(message._id)}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
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
    </div>
  );
};

export default ChatWindow;
