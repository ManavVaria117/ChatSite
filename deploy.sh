#!/bin/bash

# Build frontend for Vercel
echo "Building frontend for Vercel..."
cd client/client

# Install dependencies
npm install

# Build for production
npm run build

echo "✅ Frontend built successfully!"
echo "📁 Build output: dist/"
echo ""
echo "🚀 Ready for Vercel deployment!"
echo ""
echo "Next steps:"
echo "1. Push to GitHub"
echo "2. Connect to Vercel"
echo "3. Set environment variables in Vercel dashboard"
echo "4. Deploy backend and AI service to Render"
echo "5. Set up MongoDB Atlas"
