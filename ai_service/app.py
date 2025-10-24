from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_app():
    # Create and configure the app
    app = Flask(__name__)
    
    # Enable CORS for all routes
    CORS(app, resources={
        r"/*": {
            "origins": ["*"]
        }
    })
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        return jsonify({
            "status": "healthy",
            "timestamp": "2024-01-01T00:00:00Z",
            "services": {
                "ai_service": "running",
                "text_processing": "available"
            }
        }), 200
    
    # Import and register blueprints
    try:
        from routes import bp
        app.register_blueprint(bp)
        logger.info("Successfully registered routes")
    except Exception as e:
        logger.error(f"Failed to register routes: {e}")
        raise
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Not found"}), 404
    
    @app.errorhandler(500)
    def server_error(error):
        logger.error(f"Server Error: {error}")
        return jsonify({"error": "Internal server error"}), 500
    
    return app
