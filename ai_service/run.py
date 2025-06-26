from app import create_app
import os

# Create the Flask app
app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))  # Changed from 5000 to 5001 to avoid conflict
    print(f"Starting Flask server on port {port}")
    print("Available routes:")
    for rule in app.url_map.iter_rules():
        print(f"- {rule.endpoint}: {rule.rule}")
    
    app.run(debug=True, host='0.0.0.0', port=port)
