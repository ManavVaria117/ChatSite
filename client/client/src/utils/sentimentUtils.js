/**
 * Get an emoji based on sentiment
 * @param {string} sentiment - The sentiment ('positive', 'negative', or 'neutral')
 * @returns {string} - Corresponding emoji
 */
export const getSentimentEmoji = (sentiment) => {
  switch (sentiment) {
    case 'positive':
      return '😊';
    case 'negative':
      return '😟';
    default:
      return '😐';
  }
};

/**
 * Get a color class based on sentiment
 * @param {string} sentiment - The sentiment ('positive', 'negative', or 'neutral')
 * @returns {string} - CSS class name
 */
export const getSentimentColorClass = (sentiment) => {
  switch (sentiment) {
    case 'positive':
      return 'sentiment-positive';
    case 'negative':
      return 'sentiment-negative';
    default:
      return 'sentiment-neutral';
  }
};

/**
 * Get a human-readable label for sentiment
 * @param {string} sentiment - The sentiment ('positive', 'negative', or 'neutral')
 * @returns {string} - Human-readable label
 */
export const getSentimentLabel = (sentiment) => {
  return {
    positive: 'Positive',
    negative: 'Negative',
    neutral: 'Neutral'
  }[sentiment] || 'Unknown';
};
