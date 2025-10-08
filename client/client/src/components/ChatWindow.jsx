import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import api from '../utils/api';
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
  const [typingUsers, setTypingUsers] = useState({});
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const typingTimeoutsRef = useRef({});

  // Emojis list only; room names will be fetched by id when needed

  const availableEmojis = ['👍', '❤️', '😂', '😢', '🙏'];

  // Fetch current user details
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication required.');
      setLoadingHistory(false);
      navigate('/auth');
      return;
    }

    const fetchCurrentUser = async () => {
      try {
        const userResponse = await api.get('/api/users/me');
        setCurrentUserId(userResponse.data._id);
      } catch (err) {
        console.error('Error fetching current user:', err);
        setError('Failed to load user details.');
        navigate('/auth');
      }
    };

    fetchCurrentUser();
  }, [navigate]);

  // Determine chat name based on room id (Room document)
  useEffect(() => {
    if (!roomId) return;
    const fetchRoom = async () => {
      try {
        const token = localStorage.getItem('token');
        const resp = await api.get(`/api/rooms/${roomId}`);
        // Prefer description as display name; fallback to name
        setOtherUsername(resp.data.description || resp.data.name || 'Chat');
      } catch (e) {
        console.error('Error fetching room info:', e);
        setOtherUsername('Chat');
      }
    };
    fetchRoom();
  }, [currentUserId, roomId]);

  // Fetch message history
  useEffect(() => {
    const fetchMessageHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await api.get(`/api/messages/${roomId}`);
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

    // Disconnect any existing socket connection
    if (socket) {
      socket.disconnect();
    }

    // Create new socket connection
    socket = io(ENDPOINT, {
      query: { token, roomId },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    // Join the room
    socket.emit('joinRoom', roomId);
    console.log('Socket connected, joining room:', roomId);

    // Track processed message IDs to prevent duplicates
    const processedMessageIds = new Set();
    
    const handleNewMessage = (message) => {
      console.log('Processing new message:', message);
      if (message.room !== roomId) return;
      
      // Create a unique identifier for this message
      const messageId = message._id || message.tempId || 
                      `${message.sender?._id}-${message.content}-${message.timestamp}`;
      
      // If we've already processed this message, skip it
      if (processedMessageIds.has(messageId)) {
        console.log('Skipping duplicate message:', messageId);
        return;
      }
      
      // Mark this message as processed
      processedMessageIds.add(messageId);
      
      setMessages(prev => {
        // Check if message already exists in the current state
        const existingMsgIndex = prev.findIndex(msg => {
          // Match by server ID
          if (message._id && msg._id === message._id) return true;
          // Match by temp ID if it's an optimistic update
          if (message.tempId && msg.tempId === message.tempId) return true;
          // Match by content and sender if timestamps are close
          if (msg.content === message.content && 
              msg.sender?._id === message.sender?._id &&
              Math.abs(new Date(msg.timestamp) - new Date(message.timestamp)) < 5000) {
            return true;
          }
          return false;
        });
        
        const newMessage = { 
          ...message, 
          reactions: message.reactions || [],
          // If this is a server confirmation of an optimistic update, keep the optimistic flag
          isOptimistic: message.isOptimistic || prev.some(m => m.tempId === message.tempId)
        };
        
        if (existingMsgIndex !== -1) {
          // Update existing message but preserve the optimistic flag if it was set
          const existingMessage = prev[existingMsgIndex];
          const updatedMessage = {
            ...newMessage,
            // Preserve the optimistic flag if the existing message had it
            isOptimistic: existingMessage.isOptimistic || newMessage.isOptimistic
          };
          
          console.log('Updating existing message:', messageId);
          const newMessages = [...prev];
          newMessages[existingMsgIndex] = updatedMessage;
          return newMessages;
        } else {
          // Add new message
          console.log('Adding new message:', messageId);
          return [...prev, newMessage];
        }
      });
    };
    
    // Handle both regular and server-sent messages
    socket.on('receiveMessage', handleNewMessage);
    socket.on('newMessage', handleNewMessage);

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
      if (err && /auth/i.test(err.message)) {
        setError('Chat authentication failed. Please log in again.');
        localStorage.removeItem('token');
        navigate('/auth');
      } else {
        setError('Failed to connect to chat server.');
      }
    });

    socket.on('authError', (msg) => {
      console.error('Socket authentication error:', msg);
      setError('Chat authentication failed. Please log in again.');
      localStorage.removeItem('token');
      navigate('/login');
    });
    
    // Typing indicators
    socket.on('typing', ({ roomId: typingRoomId, userId, username }) => {
      console.log(`User ${username} is typing in room ${typingRoomId}`);
      if (typingRoomId === roomId && userId !== currentUserId) {
        setTypingUsers(prev => ({
          ...prev,
          [userId]: username
        }));

        // Clear any existing timeout for this user
        if (typingTimeoutsRef.current[userId]) {
          clearTimeout(typingTimeoutsRef.current[userId]);
        }

        // Set a timeout to automatically remove the typing indicator after 3 seconds
        typingTimeoutsRef.current[userId] = setTimeout(() => {
          setTypingUsers(prev => {
            const newTypingUsers = { ...prev };
            delete newTypingUsers[userId];
            return newTypingUsers;
          });
          delete typingTimeoutsRef.current[userId];
        }, 3000);
      }
    });

    socket.on('stop typing', ({ roomId: typingRoomId, userId }) => {
      console.log(`User ${userId} stopped typing in room ${typingRoomId}`);
      if (typingRoomId === roomId && userId !== currentUserId) {
        setTypingUsers(prev => {
          const newTypingUsers = { ...prev };
          delete newTypingUsers[userId];
          return newTypingUsers;
        });
        
        // Clear the timeout since we're explicitly stopping typing
        if (typingTimeoutsRef.current[userId]) {
          clearTimeout(typingTimeoutsRef.current[userId]);
          delete typingTimeoutsRef.current[userId];
        }
      }
    });
    
    // Cleanup function
    return () => {
      if (socket) {
        console.log('Cleaning up socket connection');
        // Remove all event listeners to prevent memory leaks
        const events = [
          'typing',
          'stop typing',
          'receiveMessage',
          'newMessage',
          'updateMessage',
          'connect_error',
          'authError',
          'connect',
          'disconnect',
          'error'
        ];
        
        events.forEach(event => {
          socket.off(event);
        });
        
        // Clear any pending timeouts
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        
        // Clear all typing timeouts
        Object.values(typingTimeoutsRef.current).forEach(timeoutId => {
          clearTimeout(timeoutId);
        });
        
        // Disconnect the socket
        socket.disconnect();
        socket = null;
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

  const handleInputChange = (e) => {
    const message = e.target.value;
    setNewMessage(message);
    
    // Only proceed if we have a valid socket and roomId
    if (!socket || !roomId) return;
    
    // Emit typing event when user starts typing
    if (!isTypingRef.current && message.trim() !== '') {
      isTypingRef.current = true;
      console.log('Emitting typing event for room:', roomId);
      socket.emit('typing', roomId);
    } else if (message.trim() === '') {
      // If message is empty, stop typing
      isTypingRef.current = false;
      socket.emit('stop typing', roomId);
    }
    
    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set a timeout to emit stop typing when user pauses
    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        console.log('User stopped typing, emitting stop typing event');
        isTypingRef.current = false;
        socket.emit('stop typing', roomId);
      }
    }, 2000); // 2 seconds delay before stopping typing indicator
  };
  
  const handleSendMessage = (e) => {
    e.preventDefault();
    const messageContent = newMessage.trim();
    
    if (!messageContent || !socket || !roomId || !currentUserId) {
      console.log('Cannot send message: Missing required data', {
        hasContent: !!messageContent,
        hasSocket: !!socket,
        hasRoomId: !!roomId,
        hasUserId: !!currentUserId
      });
      return;
    }

    // Stop typing indicator when message is sent
    if (isTypingRef.current) {
      socket.emit('stop typing', roomId);
      isTypingRef.current = false;
    }
    
    // Clear any existing typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Get the current user's info
    const currentUser = JSON.parse(localStorage.getItem('user'));
    const username = currentUser?.username || 'You';
    const tempId = `temp-${Date.now()}`;
    const timestamp = new Date();
    
    // Create a temporary message for optimistic update
    const tempMessage = {
      _id: tempId,
      tempId,
      sender: { 
        _id: currentUserId,
        username: username
      },
      content: messageContent,
      timestamp,
      reactions: [],
      room: roomId,
      isOptimistic: true
    };

    // Add the message to the local state first for immediate feedback
    setMessages(prev => {
      // Check if message already exists to prevent duplicates
      const messageExists = prev.some(msg => 
        msg._id === tempMessage._id || 
        (msg.tempId && msg.tempId === tempMessage.tempId)
      );
      
      if (messageExists) {
        console.log('Message already exists, not adding again');
        return prev;
      }
      return [...prev, tempMessage];
    });
    
    // Clear the input field
    setNewMessage('');

    // Send the message to the server
    if (socket) {
      console.log('Emitting sendMessage event with tempId:', tempId);
      socket.emit('sendMessage', { 
        roomId, 
        content: messageContent,
        tempId
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
      {Object.keys(typingUsers).length > 0 && (
        <div className="typing-indicator">
          <span>
            {Object.entries(typingUsers).map(([userId, username], index, array) => (
              <span key={userId}>
                {username}
                {index < array.length - 2 ? ', ' : index === array.length - 2 && array.length > 1 ? ' and ' : ''}
              </span>
            ))}
            {Object.keys(typingUsers).length === 1 ? ' is ' : ' are '}
            typing
          </span>
          <span className="typing-dots">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </div>
      )}
      <form onSubmit={handleSendMessage} className="message-input-form">
        <input
          type="text"
          value={newMessage}
          onChange={handleInputChange}
          placeholder="Enter message..."
          className="message-input"
        />
        <button type="submit" className="send-button">Send</button>
      </form>
    </div>
  );
};

export default ChatWindow;
