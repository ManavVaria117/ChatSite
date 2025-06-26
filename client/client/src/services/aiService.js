import axios from 'axios';

const API_URL = 'http://localhost:5001/api/ai';

/**
 * Get smart replies for a message
 * @param {string} message - The message to generate replies for
 * @returns {Promise<Array<string>>} - Array of reply suggestions
 */
export const getSmartReplies = async (message) => {
  try {
    const response = await axios.post(`${API_URL}/generate-replies`, { message });
    return response.data.replies || [];
  } catch (error) {
    console.error('Error getting smart replies:', error);
    return [];
  }
};

/**
 * Analyze the sentiment of a message
 * @param {string} text - The text to analyze
 * @returns {Promise<string>} - The sentiment ('positive', 'negative', or 'neutral')
 */
export const analyzeSentiment = async (text) => {
  try {
    const response = await axios.post(`${API_URL}/analyze-sentiment`, { text });
    return response.data.sentiment || 'neutral';
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return 'neutral';
  }
};

/**
 * Get message sentiment from the server
 * @param {string} messageId - The ID of the message
 * @returns {Promise<string>} - The sentiment of the message
 */
export const getMessageSentiment = async (messageId) => {
  try {
    const response = await axios.get(`/api/messages/${messageId}/sentiment`);
    return response.data.sentiment || 'neutral';
  } catch (error) {
    console.error('Error getting message sentiment:', error);
    return 'neutral';
  }
};

export default {
  getSmartReplies,
  analyzeSentiment,
  getMessageSentiment
};
