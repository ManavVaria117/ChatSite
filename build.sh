#!/bin/bash

# Build frontend
echo "Building frontend..."
cd client/client
npm install
npm run build

# Go back to root
cd ../../

# Install backend dependencies
echo "Installing backend dependencies..."
cd server
npm install

# Install AI service dependencies
echo "Installing AI service dependencies..."
cd ../ai_service
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

echo "✅ Build completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Copy .env.example to .env and fill in your values"
echo "2. Copy client/.env.example to client/.env and update URLs"
echo "3. Choose a deployment platform and follow the guide"
echo ""
echo "🚀 Ready for deployment!"
