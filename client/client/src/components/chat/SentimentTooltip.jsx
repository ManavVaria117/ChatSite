import React from 'react';
import PropTypes from 'prop-types';
import { FaInfoCircle } from 'react-icons/fa';
import SentimentIndicator from '../common/SentimentIndicator';
import './SentimentTooltip.css';

/**
 * SentimentTooltip component shows sentiment analysis details in a tooltip
 * @param {Object} props - Component props
 * @param {string} props.sentiment - The sentiment value ('positive', 'negative', or 'neutral')
 * @param {string} [props.className] - Additional CSS class
 * @returns {JSX.Element} - Rendered component
 */
const SentimentTooltip = ({ sentiment, className = '' }) => {
  return (
    <div className={`sentiment-tooltip ${className}`}>
      <FaInfoCircle className="info-icon" />
      <div className="tooltip-content">
        <div className="tooltip-header">
          <span>Sentiment Analysis</span>
          <SentimentIndicator sentiment={sentiment} showLabel />
        </div>
        <div className="tooltip-body">
          {sentiment === 'positive' && (
            <p>This message has a positive tone. 😊</p>
          )}
          {sentiment === 'negative' && (
            <p>This message has a negative tone. 😟</p>
          )}
          {sentiment === 'neutral' && (
            <p>This message has a neutral tone. 😐</p>
          )}
        </div>
      </div>
    </div>
  );
};

SentimentTooltip.propTypes = {
  sentiment: PropTypes.oneOf(['positive', 'negative', 'neutral']).isRequired,
  className: PropTypes.string,
};

export default SentimentTooltip;
