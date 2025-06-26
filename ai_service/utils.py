import logging
from typing import List
from textblob import TextBlob

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Common responses for different sentiment categories
POSITIVE_RESPONSES = [
    "That's great to hear!",
    "I'm glad you're feeling positive!",
    "That's wonderful news!"
]

NEUTRAL_RESPONSES = [
    "I see.",
    "I understand.",
    "Thanks for sharing.",
    "Got it.",
    "Interesting."
]

NEGATIVE_RESPONSES = [
    "I'm sorry to hear that.",
    "That sounds tough.",
    "I'm here to listen.",
    "That must be difficult.",
    "I understand how you feel."
]

GENERIC_RESPONSES = [
    "Could you tell me more about that?",
    "How does that make you feel?",
    "What else is on your mind?",
    "I'm here to help.",
    "Thanks for sharing your thoughts."
]


def get_sentiment(text):
    """
    Enhanced sentiment analysis using TextBlob with custom heuristics.
    Returns 'positive', 'negative', or 'neutral'.
    """
    if not text or not isinstance(text, str):
        return 'neutral'
    
    try:
        # Convert to lowercase for case-insensitive matching
        lower_text = text.lower()
        
        # Custom word lists for sentiment analysis
        positive_words = {
            'love', 'great', 'amazing', 'wonderful', 'excellent', 'fantastic',
            'superb', 'awesome', 'perfect', 'brilliant', 'outstanding', 'happy',
            'joy', 'delight', 'pleasure', 'thrilled', 'ecstatic', 'fabulous',
            'terrific', 'super', 'wow', 'yay', 'yippee', 'hooray', 'nice', 'good'
        }
        
        negative_words = {
            'hate', 'terrible', 'awful', 'horrible', 'worst', 'bad', 'sad',
            'angry', 'mad', 'upset', 'disappoint', 'failure', 'fail', 'crap',
            'suck', 'awful', 'dreadful', 'miserable', 'tragic', 'unhappy',
            'annoy', 'irritat', 'frustrat', 'awful', 'poor', 'boring'
        }
        
        # Count positive and negative words
        pos_count = sum(1 for word in positive_words if word in lower_text)
        neg_count = sum(1 for word in negative_words if word in lower_text)
        
        # Check for exclamation marks and question marks
        has_exclamation = '!' in text
        has_question = '?' in text
        
        # Check for ALL CAPS (might indicate strong emotion)
        all_caps = text.isupper()
        
        # Get TextBlob sentiment
        blob = TextBlob(text)
        polarity = blob.sentiment.polarity
        
        # Debug output
        print(f"\n--- Sentiment Analysis ---")
        print(f"Text: {text}")
        print(f"Positive words: {pos_count}, Negative words: {neg_count}")
        print(f"Polarity: {polarity}")
        print(f"Has !: {has_exclamation}, Has ?: {has_question}, ALL CAPS: {all_caps}")
        
        # Custom scoring
        score = 0
        score += pos_count * 0.2
        score -= neg_count * 0.2
        score += polarity
        
        # Adjust for emphasis
        if has_exclamation:
            score *= 1.3
        if all_caps:
            score *= 1.5
            
        print(f"Final score: {score}")
        
        # Determine sentiment based on score
        if score > 0.3:
            print("Classified as: positive")
            return 'positive'
        elif score < -0.3:
            print("Classified as: negative")
            return 'negative'
        else:
            print("Classified as: neutral")
            return 'neutral'
            
    except Exception as e:
        logger.error(f"Error in sentiment analysis: {e}", exc_info=True)
        return 'neutral'


def generate_replies(message, num_replies=3):
    """
    Generate simple replies using TextBlob sentiment analysis.
    Returns a list of reply suggestions.
    """
    if not message or not isinstance(message, str):
        return ["I'm not sure how to respond to that.", "Interesting!", "Tell me more."]
    
    try:
        sentiment = get_sentiment(message)
        if sentiment == 'positive':
            return POSITIVE_RESPONSES[:num_replies]
        elif sentiment == 'negative':
            return NEGATIVE_RESPONSES[:num_replies]
        else:
            return GENERIC_RESPONSES[:num_replies]
    except Exception as e:
        logger.error(f"Error in generate_replies: {str(e)}", exc_info=True)
        return ["I'm having trouble thinking of a response right now.", "Let me think about that..."]
