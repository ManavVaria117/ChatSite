import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { format, startOfDay, addDays, differenceInMilliseconds } from 'date-fns';
import './RoomStatus.css';

const RoomStatus = () => {
  const [status, setStatus] = useState({
    currentWeek: '',
    weekStart: null,
    weekEnd: null,
    suggestions: [],
    rooms: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const [isMounted, setIsMounted] = useState(true);

  const fetchRoomStatus = useCallback(async () => {
    try {
      const response = await api.get('/api/room-status');
      setStatus({
        ...response.data,
        weekStart: new Date(response.data.weekStart),
        weekEnd: new Date(response.data.weekEnd)
      });
      return response.data;
    } catch (err) {
      console.error('Error fetching room status:', err);
      setError('Failed to load room status');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoomStatus();
  }, [fetchRoomStatus]);

  // Calculate time until next rotation (Sunday at midnight)
  useEffect(() => {
    const calculateTimeLeft = () => {
      try {
        const now = new Date();
        // Get next Sunday
        const daysUntilSunday = 7 - now.getDay(); // 0 is Sunday, so this gives us days until next Sunday
        const nextSunday = startOfDay(addDays(now, daysUntilSunday));
        
        const diff = differenceInMilliseconds(nextSunday, now);
        
        if (diff > 0) {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          
          if (isMounted) {
            setTimeLeft(`${days}d ${hours}h ${minutes}m`);
          }
        } else {
          // If it's already past Sunday, refresh the data
          if (isMounted) {
            fetchRoomStatus();
          }
        }
      } catch (err) {
        console.error('Error calculating time left:', err);
      }
    };

    // Calculate immediately
    calculateTimeLeft();
    
    // Then update every minute
    const timer = setInterval(calculateTimeLeft, 60000);
    
    return () => {
      clearInterval(timer);
      setIsMounted(false);
    };
  }, [fetchRoomStatus, isMounted]);

  const handleVote = async (suggestionId, voteType) => {
    try {
      await api.put(
        `/api/suggestions/vote/${suggestionId}`,
        { voteType },
        {}
      );
      // Refresh the status after voting
      window.location.reload();
    } catch (err) {
      console.error('Error voting:', err);
      setError('Failed to submit vote');
    }
  };

  if (loading) return <div className="loading">Loading room status...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="room-status">
      <div className="status-header">
        <h2>Weekly Room Rotation</h2>
        <div className="week-info">
          <div className="week-number">
            Week {status.currentWeek.split('-W')[1]}, {status.currentWeek.split('-')[0]}
          </div>
          <div className="date-range">
            {format(status.weekStart, 'MMM d')} - {format(status.weekEnd, 'MMM d, yyyy')}
          </div>
          <div className="next-rotation">
            Next rotation in: <span className="countdown">{timeLeft}</span>
          </div>
        </div>
      </div>

      <div className="suggestions-section">
        <h3>Top Room Suggestions</h3>
        {status.suggestions.length > 0 ? (
          <div className="suggestions-list">
            {status.suggestions.map((suggestion, index) => (
              <div key={suggestion._id} className="suggestion-card">
                <div className="suggestion-info">
                  <div className="suggestion-name">{suggestion.name}</div>
                  <div className="suggestion-description">{suggestion.description}</div>
                  <div className="vote-count">
                    <span className="upvotes">▲ {suggestion.upVotes}</span>
                    <span className="downvotes">▼ {suggestion.downVotes}</span>
                    <span className="score">Score: {suggestion.score}</span>
                  </div>
                </div>
                <div className="vote-buttons">
                  <button 
                    onClick={() => handleVote(suggestion._id, 'up')}
                    className="vote-btn upvote"
                  >
                    ▲ Upvote
                  </button>
                  <button 
                    onClick={() => handleVote(suggestion._id, 'down')}
                    className="vote-btn downvote"
                  >
                    ▼ Downvote
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No suggestions yet. Be the first to suggest a room!</p>
        )}
      </div>

      <div className="rooms-section">
        <h3>Current Rooms</h3>
        <div className="rooms-list">
          {status.rooms.map((room) => (
            <div key={room._id} className="room-card">
              <div className="room-name">{room.name}</div>
              <div className="room-meta">
                <span>Messages: {room.messageCount || 0}</span>
                <span>
                  Last active: {room.lastActivity ? 
                    format(new Date(room.lastActivity), 'MMM d, yyyy') : 
                    'N/A'}
                </span>
                {room.isTemporary && room.expiresAt && (
                  <span className="temporary">
                    Expires: {format(new Date(room.expiresAt), 'MMM d, yyyy')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoomStatus;
