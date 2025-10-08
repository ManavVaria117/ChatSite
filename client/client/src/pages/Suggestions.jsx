import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './Suggestions.css';

const Suggestions = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');

  // Fetch all suggestions
  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/suggestions');
      setSuggestions(response.data);
    } catch (err) {
      setError('Failed to fetch suggestions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Submit new suggestion
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/suggestions', formData);
      setFormData({ name: '', description: '' });
      setShowForm(false);
      fetchSuggestions();
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to submit suggestion');
    }
  };

  // Handle voting
  const handleVote = async (suggestionId, voteType) => {
    try {
      await api.put(`/api/suggestions/vote/${suggestionId}`,
        { voteType }
      );
      fetchSuggestions();
    } catch (err) {
      console.error('Voting error:', err.response?.data || err.message);
      setError(err.response?.data?.msg || 'Failed to submit vote');
    }
  };

  // Safely convert any ID to string for comparison
  const safeToString = (id) => {
    if (!id) return '';
    if (typeof id === 'string') return id;
    if (id.toString) return id.toString();
    if (id._id) return safeToString(id._id);
    if (id.id) return safeToString(id.id);
    return String(id);
  };

  // Check if user has voted on a suggestion
  const hasUserVoted = (suggestion, voteType) => {
    try {
      if (!suggestion || !suggestion.votes || !Array.isArray(suggestion.votes)) {
        console.log('hasUserVoted: Invalid suggestion or votes array');
        return false;
      }
      
      const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
      const currentUserId = safeToString(currentUser?._id);
      if (!currentUserId) {
        console.log('hasUserVoted: No current user ID');
        return false;
      }
      
      const hasVoted = suggestion.votes.some((vote) => {
        if (!vote || !vote.user) {
          console.log('hasUserVoted: Invalid vote or missing user', { vote });
          return false;
        }
        
        const voteUserId = safeToString(vote.user);
        const typesMatch = vote.voteType === voteType;
        const usersMatch = voteUserId === currentUserId;
        
        console.log('hasUserVoted: Checking vote', {
          voteUserId,
          currentUserId,
          voteType: vote.voteType,
          targetVoteType: voteType,
          typesMatch,
          usersMatch
        });
        
        return usersMatch && typesMatch;
      });
      
      console.log('hasUserVoted: Final result', { hasVoted });
      return hasVoted;
    } catch (error) {
      console.error('Error in hasUserVoted:', error);
      return false;
    }
  };

  // Initial fetch
  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }
    fetchSuggestions();
  }, []);

  if (loading) return <div className="loading">Loading suggestions...</div>;

  return (
    <div className="suggestions-container">
      <h1>Room Suggestions</h1>
      
      {error && <div className="error-message">{error}</div>}
      
      <button 
        className="btn btn-primary mb-4" 
        onClick={() => setShowForm(!showForm)}
      >
        {showForm ? 'Cancel' : 'Suggest a Room'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="suggestion-form">
          <div className="form-group">
            <label>Room Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="form-control"
              required
              minLength="3"
              maxLength="50"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="form-control"
              rows="3"
              required
              maxLength="500"
            />
          </div>
          <button type="submit" className="btn btn-success">
            Submit Suggestion
          </button>
        </form>
      )}

      <div className="suggestions-list">
        {suggestions.length === 0 ? (
          <p>No suggestions yet. Be the first to suggest a room!</p>
        ) : (
          suggestions.map((suggestion) => (
            <div key={suggestion._id} className="suggestion-card">
              <div className="suggestion-header">
                <h3>{suggestion.name}</h3>
                <span className={`status-badge ${suggestion.status}`}>
                  {suggestion.status}
                </span>
              </div>
              <p className="suggestion-description">{suggestion.description}</p>
              <div className="suggestion-footer">
                <div className="voting-buttons">
                  <button
                    className={`btn btn-sm me-2 ${
                      hasUserVoted(suggestion, 'up') ? 'btn-success' : 'btn-outline-success'
                    }`}
                    onClick={() => handleVote(suggestion._id, 'up')}
                    disabled={suggestion.status !== 'pending'}
                  >
                    👍 {suggestion.votes?.filter(v => v && v.voteType === 'up').length || 0}
                  </button>
                  <button
                    className={`btn btn-sm ${
                      hasUserVoted(suggestion, 'down') ? 'btn-danger' : 'btn-outline-danger'
                    }`}
                    onClick={() => handleVote(suggestion._id, 'down')}
                    disabled={suggestion.status !== 'pending'}
                  >
                    👎 {suggestion.votes?.filter(v => v && v.voteType === 'down').length || 0}
                  </button>
                </div>
                <div className="suggestion-meta">
                  <small className="text-muted">
                    Suggested by {suggestion.createdBy?.username || 'Unknown'}
                  </small>
                  <small className="text-muted ms-2">
                    Score: {suggestion.voteScore}
                  </small>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Suggestions;
