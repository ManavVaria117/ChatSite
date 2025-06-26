import { useState, useCallback } from 'react';
import { getSmartReplies, analyzeSentiment } from '../services/aiService';

/**
 * Custom hook to manage AI features in chat
 * @returns {Object} AI feature methods and state
 */
export const useAIFeatures = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [smartReplies, setSmartReplies] = useState([]);
  const [sentiment, setSentiment] = useState('neutral');

  /**
   * Get smart replies for a message
   * @param {string} message - The message to generate replies for
   */
  const fetchSmartReplies = useCallback(async (message) => {
    if (!message?.trim()) {
      setSmartReplies([]);
      return;
    }

    try {
      setIsAnalyzing(true);
      const replies = await getSmartReplies(message);
      setSmartReplies(replies);
    } catch (error) {
      console.error('Failed to fetch smart replies:', error);
      setSmartReplies([]);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  /**
   * Analyze the sentiment of a message
   * @param {string} text - The text to analyze
   * @returns {Promise<string>} - The sentiment of the text
   */
  const analyzeMessageSentiment = useCallback(async (text) => {
    if (!text?.trim()) return 'neutral';
    
    try {
      setIsAnalyzing(true);
      const result = await analyzeSentiment(text);
      setSentiment(result);
      return result;
    } catch (error) {
      console.error('Failed to analyze sentiment:', error);
      return 'neutral';
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  /**
   * Clear the current smart replies
   */
  const clearSmartReplies = useCallback(() => {
    setSmartReplies([]);
  }, []);

  return {
    isAnalyzing,
    smartReplies,
    sentiment,
    fetchSmartReplies,
    analyzeMessageSentiment,
    clearSmartReplies,
  };
};

export default useAIFeatures;
