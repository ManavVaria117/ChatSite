# AI Microservice for MERN Chat App

This is a Python-based AI microservice that provides smart replies and sentiment analysis for a MERN stack chat application.

## Features

- 🤖 Smart reply generation using OpenAI's GPT-3.5-turbo
- 😊 Sentiment analysis using TextBlob or Hugging Face's DistilBERT
- 🔒 Secure API endpoints with CORS support
- 📝 Comprehensive error handling and logging

## Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd ai-service
   ```

2. **Create and activate a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Add your OpenAI API key
   - Configure other settings as needed

5. **Run the service**
   ```bash
   python app.py
   ```
   The service will start on `http://localhost:5000`

## API Endpoints

### Health Check
- `GET /api/ai/health`
  - Returns: `{"status": "healthy"}`

### Generate Smart Replies
- `POST /api/ai/generate-replies`
  - **Request Body**:
    ```json
    {
      "message": "How are you?",
      "num_replies": 3
    }
    ```
  - **Response**:
    ```json
    {
      "replies": ["I'm good, thanks!", "Doing well!", "Pretty good! You?"]
    }
    ```

### Analyze Sentiment
- `POST /api/ai/analyze-sentiment`
  - **Request Body**:
    ```json
    {
      "message": "I love this chat app!"
    }
    ```
  - **Response**:
    ```json
    {
      "sentiment": "Positive"
    }
    ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key | - |
| `USE_HF_MODEL` | Use Hugging Face model (True/False) | False |
| `FLASK_ENV` | Flask environment (development/production) | development |
| `PORT` | Port to run the server on | 5000 |

## Integration with MERN Stack

1. **From your Node.js backend**:
   ```javascript
   const axios = require('axios');
   
   // Generate replies
   const getSmartReplies = async (message) => {
     try {
       const response = await axios.post('http://localhost:5000/api/ai/generate-replies', {
         message: message,
         num_replies: 3
       });
       return response.data.replies;
     } catch (error) {
       console.error('Error getting smart replies:', error);
       return [];
     }
   };
   
   // Analyze sentiment
   const analyzeMessageSentiment = async (message) => {
     try {
       const response = await axios.post('http://localhost:5000/api/ai/analyze-sentiment', {
         message: message
       });
       return response.data.sentiment;
     } catch (error) {
       console.error('Error analyzing sentiment:', error);
       return 'Neutral';
     }
   };
   ```

2. **From your React frontend**:
   ```javascript
   // Example using fetch
   const fetchSmartReplies = async (message) => {
     try {
       const response = await fetch('http://localhost:5000/api/ai/generate-replies', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({ message }),
       });
       const data = await response.json();
       return data.replies || [];
     } catch (error) {
       console.error('Error:', error);
       return [];
     }
   };
   ```

## Error Handling

All endpoints return appropriate HTTP status codes and error messages in the following format:
```json
{
  "error": "Error message here"
}
```

## License

MIT
