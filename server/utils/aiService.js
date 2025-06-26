const axios = require('axios');

const AI_SERVICE_URL = 'http://localhost:5001/api/ai';

/**
 * Get smart replies for a message
 * @param {string} message - The message to generate replies for
 * @returns {Promise<Array<string>>} - Array of reply suggestions
 */
async function getSmartReplies(message) {
    try {
        const response = await axios.post(`${AI_SERVICE_URL}/generate-replies`, { message });
        return response.data.replies || [];
    } catch (error) {
        console.error('Error getting smart replies:', error.message);
        return [];
    }
}

/**
 * Analyze the sentiment of a message
 * @param {string} text - The text to analyze
 * @returns {Promise<string>} - The sentiment ('positive', 'negative', or 'neutral')
 */
async function analyzeSentiment(text) {
    try {
        const response = await axios.post(`${AI_SERVICE_URL}/analyze-sentiment`, { text });
        return response.data.sentiment || 'neutral';
    } catch (error) {
        console.error('Error analyzing sentiment:', error.message);
        return 'neutral';
    }
}

module.exports = {
    getSmartReplies,
    analyzeSentiment
};
