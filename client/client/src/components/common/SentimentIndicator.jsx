import React from 'react';
import PropTypes from 'prop-types';
import { getSentimentEmoji, getSentimentColorClass } from '../../utils/sentimentUtils';

/**
 * SentimentIndicator component displays sentiment with an emoji and optional label
 * @param {Object} props - Component props
 * @param {string} props.sentiment - The sentiment value ('positive', 'negative', or 'neutral')
 * @param {boolean} [props.showLabel=false] - Whether to show the sentiment label
 * @param {string} [props.className] - Additional CSS class
 * @returns {JSX.Element} - Rendered component
 */
const SentimentIndicator = ({ sentiment, showLabel = false, className = '' }) => {
  const emoji = getSentimentEmoji(sentiment);
  const colorClass = getSentimentColorClass(sentiment);
  
  return (
    <span className={`sentiment-indicator ${colorClass} ${className}`}>
      <span className="sentiment-emoji" aria-hidden="true">
        {emoji}
      </span>
      {showLabel && (
        <span className="sentiment-label">
          {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
        </span>
      )}
    </span>
  );
};

SentimentIndicator.propTypes = {
  sentiment: PropTypes.oneOf(['positive', 'negative', 'neutral']).isRequired,
  showLabel: PropTypes.bool,
  className: PropTypes.string,
};

export default SentimentIndicator;
