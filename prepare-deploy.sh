# Vercel + Render + MongoDB Atlas Deployment Script
# Run this script to prepare everything for deployment

echo "🚀 Preparing ChatSite for deployment..."
echo ""

# Build frontend
echo "📦 Building frontend for Vercel..."
cd client/client
npm install
npm run build
echo "✅ Frontend built successfully!"
echo "📁 Output: dist/"
cd ../../

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd server
npm install
cd ../

# Install AI service dependencies
echo "📦 Installing AI service dependencies..."
cd ai_service
python -m venv .venv 2>/dev/null || echo "Virtual environment already exists"
source .venv/bin/activate 2>/dev/null || .venv/Scripts/activate 2>/dev/null || echo "Using system Python"
pip install -r requirements.txt
cd ../

echo ""
echo "✅ All services prepared successfully!"
echo ""
echo "📋 Next steps:"
echo "1. 📊 Set up MongoDB Atlas (free)"
echo "2. 🌐 Deploy frontend to Vercel"
echo "3. ⚡ Deploy backend & AI service to Render"
echo "4. 🔧 Set environment variables"
echo ""
echo "🚀 Ready for deployment!"
echo ""
echo "📖 Check README.md for detailed instructions"
