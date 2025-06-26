from flask import Blueprint, request, jsonify
import logging

# Create blueprint
bp = Blueprint('ai', __name__)
logger = logging.getLogger(__name__)

try:
    from utils import generate_replies, get_sentiment
except ImportError as e:
    logger.error(f"Failed to import utils: {e}")
    raise

@bp.route('/api/ai/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy"}), 200

@bp.route('/api/ai/generate-replies', methods=['POST'])
def get_replies():
    """
    Generate smart replies for a given message
    Expected JSON: {"message": "your message here"}
    """
    try:
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({"error": "Missing 'message' in request body"}), 400
        
        message = data['message']
        num_replies = min(int(data.get('num_replies', 3)), 5)  # Max 5 replies
        
        replies = generate_replies(message, num_replies)
        return jsonify({"replies": replies})
        
    except Exception as e:
        logger.error(f"Error in /generate-replies: {str(e)}")
        return jsonify({"error": "Failed to generate replies"}), 500

@bp.route('/api/ai/analyze-sentiment', methods=['POST'])
def analyze_sentiment():
    """
    Analyze sentiment of a given message
    Expected JSON: {"message": "your message here"}
    """
    try:
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({"error": "Missing 'message' in request body"}), 400
        
        message = data['message']
        sentiment = get_sentiment(message)
        return jsonify({"sentiment": sentiment})
        
    except Exception as e:
        logger.error(f"Error in /analyze-sentiment: {str(e)}")
        return jsonify({"error": "Failed to analyze sentiment"}), 500
