import React from 'react';
import PropTypes from 'prop-types';
import { FaRobot } from 'react-icons/fa';
import './SmartReplies.css';

/**
 * SmartReplies component displays AI-generated reply suggestions
 * @param {Object} props - Component props
 * @param {Array<string>} props.replies - Array of reply suggestions
 * @param {Function} props.onSelect - Callback when a reply is selected
 * @param {boolean} [props.isLoading=false] - Loading state
 * @returns {JSX.Element} - Rendered component
 */
const SmartReplies = ({ replies, onSelect, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="smart-replies">
        <div className="smart-replies-header">
          <FaRobot className="robot-icon" />
          <span>AI is thinking...</span>
        </div>
      </div>
    );
  }

  if (!replies?.length) return null;

  return (
    <div className="smart-replies">
      <div className="smart-replies-header">
        <FaRobot className="robot-icon" />
        <span>Suggested replies:</span>
      </div>
      <div className="smart-replies-list">
        {replies.map((reply, index) => (
          <button
            key={index}
            className="smart-reply"
            onClick={() => onSelect(reply)}
            aria-label={`Use reply: ${reply}`}
          >
            {reply}
          </button>
        ))}
      </div>
    </div>
  );
};

SmartReplies.propTypes = {
  replies: PropTypes.arrayOf(PropTypes.string).isRequired,
  onSelect: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
};

export default SmartReplies;
