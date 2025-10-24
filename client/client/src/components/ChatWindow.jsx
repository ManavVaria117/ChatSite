import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { formatTimestamp } from '../utils/formatTimestamp';
import SmartReplies from './chat/SmartReplies';
import SentimentTooltip from './chat/SentimentTooltip';
import './ChatWindow.css';
import '../styles/sentiment.css';
import '../styles/chat-input.css';

// Replace with your backend URL
const ENDPOINT = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getSentimentEmoji = (sentiment) => {
  switch (sentiment) {
    case 'positive':
      return '😊';
    case 'negative':
      return '😟';
    case 'neutral':
    default:
      return '😐';
  }
};

// top-level socket (keeps a single connection across component mounts)
let socket = null;

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
  const [smartReplies, setSmartReplies] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const typingTimeoutsRef = useRef({});

  const prebuiltRooms = {
    'general-chat': 'General Chat',
    'sports': 'Sports Talk',
    'technology': 'Tech Discussion',
    'random': 'Random Chat',
  };

  const availableEmojis = ['👍', '❤️', '😂', '😢', '🙏'];

  // fetch smart replies
  const fetchSmartReplies = useCallback(async (message) => {
    if (!message?.trim()) {
      setSmartReplies([]);
      return;
    }

    try {
      console.log('Fetching smart replies for message:', message);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:5001'}/api/ai/generate-replies`,
        { message, num_replies: 3 },
        { headers: { 'x-auth-token': token, 'Content-Type': 'application/json' } }
      );

      console.log('Smart replies response:', response.data);
      if (response.data?.replies?.length > 0) {
        setSmartReplies(response.data.replies);
      } else {
        setSmartReplies([]);
      }
    } catch (err) {
      console.error('Error fetching smart replies:', err);
      setSmartReplies([]);
    }
  }, []);

  // sentiment analyzer
  const analyzeMessageSentiment = useCallback(async (text) => {
    if (!text?.trim()) return 'neutral';
    try {
      const response = await axios.post(`${import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:5001'}/api/ai/analyze-sentiment`, {
        message: text
      });
      return response.data.sentiment || 'neutral';
    } catch (err) {
      console.error('Error analyzing sentiment:', err);
      return 'neutral';
    }
  }, []);

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
        localStorage.removeItem('token');
        navigate('/login');
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchCurrentUser();
  }, [navigate]);

  // Determine chat name
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
        setMessages(response.data || []);
      } catch (err) {
        console.error('Error fetching message history:', err);
        setError('Failed to load message history.');
      } finally {
        setLoadingHistory(false);
      }
    };

    if (roomId) fetchMessageHistory();
  }, [roomId]);

  // Socket setup — depends on roomId and currentUserId
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !roomId || !currentUserId) return;

    // If socket exists but room changed, disconnect and recreate
    if (socket && socket.roomId !== roomId) {
      try {
        socket.disconnect();
      } catch (e) { /* ignore */ }
      socket = null;
    }

    if (!socket) {
      socket = io(ENDPOINT, {
        query: { token, roomId },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });
      socket.roomId = roomId;
    }

    // join room
    socket.emit('joinRoom', roomId);
    console.log('Socket connected, joining room:', roomId);

    const processedMessageIds = new Set();

    const handleNewMessage = (message) => {
      if (!message) return;
      if (message.room && message.room !== roomId) return;

      const messageId = message._id || message.tempId ||
        `${message.sender?._id}-${message.content}-${message.timestamp}`;

      if (processedMessageIds.has(messageId)) {
        return;
      }
      processedMessageIds.add(messageId);

      setMessages(prev => {
        const existingMsgIndex = prev.findIndex(msg => {
          if (message._id && msg._id === message._id) return true;
          if (message.tempId && msg.tempId === message.tempId) return true;
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
          isOptimistic: message.isOptimistic || prev.some(m => m.tempId === message.tempId)
        };

        if (existingMsgIndex !== -1) {
          const existingMessage = prev[existingMsgIndex];
          const updatedMessage = {
            ...existingMessage,
            ...newMessage,
            isOptimistic: existingMessage.isOptimistic || newMessage.isOptimistic
          };
          const newMessages = [...prev];
          newMessages[existingMsgIndex] = updatedMessage;
          return newMessages;
        } else {
          return [...prev, newMessage];
        }
      });
    };

    const handleIncomingMessage = (message) => {
      handleNewMessage(message);

      if (message?.sender && message.sender._id !== currentUserId) {
        fetchSmartReplies(message.content);
      }
    };

    socket.on('receiveMessage', handleIncomingMessage);
    socket.on('newMessage', handleIncomingMessage);

    socket.on('updateMessage', (updatedMessage) => {
      if (!updatedMessage) return;
      setMessages(prev => {
        const messageWithReactions = {
          ...updatedMessage,
          reactions: Array.isArray(updatedMessage.reactions) ? updatedMessage.reactions : []
        };
        const idx = prev.findIndex(m => m._id === messageWithReactions._id);
        if (idx !== -1) {
          const newMessages = [...prev];
          newMessages[idx] = { ...newMessages[idx], ...messageWithReactions };
          return newMessages;
        } else {
          return [...prev, messageWithReactions];
        }
      });
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err?.message || err);
      setError('Failed to connect to chat server.');
    });

    socket.on('authError', (msg) => {
      console.error('Socket authentication error:', msg);
      setError('Chat authentication failed. Please log in again.');
      localStorage.removeItem('token');
      navigate('/login');
    });

    // typing indicators
    socket.on('typing', ({ roomId: typingRoomId, userId, username }) => {
      if (typingRoomId === roomId && userId !== currentUserId) {
        setTypingUsers(prev => ({ ...prev, [userId]: username }));

        if (typingTimeoutsRef.current[userId]) {
          clearTimeout(typingTimeoutsRef.current[userId]);
        }

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
      if (typingRoomId === roomId && userId !== currentUserId) {
        setTypingUsers(prev => {
          const newTypingUsers = { ...prev };
          delete newTypingUsers[userId];
          return newTypingUsers;
        });
        if (typingTimeoutsRef.current[userId]) {
          clearTimeout(typingTimeoutsRef.current[userId]);
          delete typingTimeoutsRef.current[userId];
        }
      }
    });

    // cleanup
    return () => {
      if (socket) {
        socket.off('receiveMessage');
        socket.off('newMessage');
        socket.off('updateMessage');
        socket.off('connect_error');
        socket.off('authError');
        socket.off('typing');
        socket.off('stop typing');
        try {
          socket.disconnect();
        } catch (e) { /* ignore */ }
        socket = null;
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      Object.values(typingTimeoutsRef.current).forEach(id => clearTimeout(id));
      typingTimeoutsRef.current = {};
    };
  }, [roomId, currentUserId, fetchSmartReplies, navigate]);

  // autoscroll
  const messageCountRef = useRef(0);
  const isInitialLoad = useRef(true);
  useEffect(() => {
    if (isInitialLoad.current || messages.length > messageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    messageCountRef.current = messages.length;
    isInitialLoad.current = false;
  }, [messages.length]);

  // click outside reaction picker
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
    const message = DOMPurify.sanitize(e.target.value);
    setNewMessage(message);

    if (!socket || !roomId) return;

    setSmartReplies([]);

    if (!isTypingRef.current && message.trim() !== '') {
      isTypingRef.current = true;
      socket.emit('typing', { roomId, userId: currentUserId });
      if (message.trim().length > 3) {
        fetchSmartReplies(message);
      }
    } else if (message.trim() === '') {
      isTypingRef.current = false;
      socket.emit('stop typing', { roomId, userId: currentUserId });
      setSmartReplies([]);
    } else if (message.trim().length > 3) {
      fetchSmartReplies(message);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        socket.emit('stop typing', { roomId, userId: currentUserId });
      }
    }, 2000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const messageContent = newMessage.trim();
    if (!messageContent) return;

    if (!socket || !roomId || !currentUserId) {
      console.log('Cannot send message: missing socket/room/user');
      return;
    }

    try {
      setIsAnalyzing(true);
      const sentiment = await analyzeMessageSentiment(messageContent);
      // optimistic local message
      const currentUser = JSON.parse(localStorage.getItem('user')) || {};
      const username = currentUser.username || 'You';
      const tempId = `temp-${Date.now()}`;
      const timestamp = new Date().toISOString();

      const tempMessage = {
        _id: tempId,
        tempId,
        sender: { _id: currentUserId, username },
        content: messageContent,
        timestamp,
        reactions: [],
        room: roomId,
        isOptimistic: true,
        sentiment
      };

      setMessages(prev => {
        const exists = prev.some(m => m._id === tempId || m.tempId === tempId);
        if (exists) return prev;
        return [...prev, tempMessage];
      });

      // stop typing
      if (isTypingRef.current) {
        socket.emit('stop typing', { roomId, userId: currentUserId });
        isTypingRef.current = false;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      setNewMessage('');
      setSmartReplies([]);

      // emit to server
      socket.emit('sendMessage', {
        roomId,
        content: messageContent,
        tempId,
        sentiment
      }, (ack) => {
        // optional ack handling
        if (ack?.error) {
          setError(ack.error);
        }
      });
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleReaction = useCallback((messageId, emoji, event) => {
    event?.stopPropagation();

    if (!socket || !currentUserId) {
      console.error('Socket not connected or user not authenticated');
      return;
    }

    setMessages(prevMessages =>
      prevMessages.map(message => {
        if ((message._id || message.tempId) !== messageId) return message;

        const updatedMessage = { ...message };
        updatedMessage.reactions = Array.isArray(updatedMessage.reactions)
          ? JSON.parse(JSON.stringify(updatedMessage.reactions))
          : [];

        const reactionIndex = updatedMessage.reactions.findIndex(r => r.emoji === emoji);
        const hasReacted = reactionIndex !== -1 &&
          updatedMessage.reactions[reactionIndex].users.some(u =>
            (u && (u._id === currentUserId)) || u === currentUserId
          );

        if (hasReacted) {
          updatedMessage.reactions[reactionIndex].users =
            updatedMessage.reactions[reactionIndex].users.filter(u =>
              !((u && u._id === currentUserId) || u === currentUserId)
            );

          if (updatedMessage.reactions[reactionIndex].users.length === 0) {
            updatedMessage.reactions.splice(reactionIndex, 1);
          }
        } else if (reactionIndex !== -1) {
          updatedMessage.reactions[reactionIndex].users.push(currentUserId);
        } else {
          updatedMessage.reactions.push({ emoji, users: [currentUserId] });
        }

        return updatedMessage;
      })
    );

    socket.emit('toggleReaction', { messageId, emoji, userId: currentUserId });
    setVisibleReactionPickerId(null);
  }, [currentUserId]);

  const formatReactions = useCallback((reactions) => {
    if (!reactions || !Array.isArray(reactions) || reactions.length === 0) return [];

    const reactionMap = {};

    reactions.forEach(reaction => {
      if (!reaction?.emoji) return;
      const emoji = reaction.emoji;
      const users = Array.isArray(reaction.users) ? reaction.users : [];

      if (!reactionMap[emoji]) {
        reactionMap[emoji] = { emoji, count: 0, users: [] };
      }

      users.forEach(user => {
        const userId = (user && (user._id || user))?.toString();
        if (userId && !reactionMap[emoji].users.some(u => {
          const candidate = (u && (u._id || u))?.toString();
          return candidate === userId;
        })) {
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
            key={message._id || message.tempId}
            className={`message ${message.sender?._id === currentUserId ? 'sent' : 'received'}`}
            data-sentiment={message.sentiment || 'neutral'}
            onClick={() => setVisibleReactionPickerId(prevId => prevId === (message._id || message.tempId) ? null : (message._id || message.tempId))}
          >
            <div className="message-sender">
              <span className="sender-username">
                {message.sender?._id === currentUserId ? 'You' : message.sender?.username || 'Unknown'}
              </span>
            </div>

            <div className="message-content">{message.content}</div>

            <div className="message-footer">
              <div className="message-meta">
                <span className="timestamp" title={new Date(message.timestamp).toLocaleString()}>
                  {formatTimestamp(message.timestamp)}
                </span>
                <span className="sentiment-indicator">
                  <span className="sentiment-emoji">{getSentimentEmoji(message.sentiment || 'neutral')}</span>
                  <SentimentTooltip sentiment={message.sentiment || 'neutral'} />
                </span>
              </div>

              <div className="reactions-container">
                {formatReactions(message.reactions || []).map((reaction, idx) => {
                  const userHasReacted = reaction.users.some(u =>
                    (u && (u._id === currentUserId)) || u === currentUserId
                  );

                  return (
                    <button
                      key={`${reaction.emoji}-${idx}`}
                      className={`reaction-pill ${userHasReacted ? 'reacted' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleReaction(message._id || message.tempId, reaction.emoji, e);
                      }}
                      title={`${reaction.count} ${reaction.count === 1 ? 'reaction' : 'reactions'}`}
                    >
                      {reaction.emoji} {reaction.count > 0 ? reaction.count : ''}
                    </button>
                  );
                })}
              </div>

              {visibleReactionPickerId === (message._id || message.tempId) && renderReactionPicker(message._id || message.tempId)}
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
          <span className="typing-dots"><span>.</span><span>.</span><span>.</span></span>
        </div>
      )}

      <div className="chat-input-container">
        <form onSubmit={handleSendMessage} className="message-input-form">
          <input
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Enter message..."
            className="message-input"
            disabled={isAnalyzing}
          />
          <button type="submit" className="send-button" disabled={isAnalyzing || !newMessage.trim()}>
            {isAnalyzing ? 'Sending...' : 'Send'}
          </button>
        </form>

        <SmartReplies
          replies={smartReplies}
          onSelect={(reply) => {
            setNewMessage(reply);
            setSmartReplies([]);
          }}
          isLoading={isAnalyzing}
        />
      </div>
    </div>
  );
};

export default ChatWindow;
