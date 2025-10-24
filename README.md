# ChatSite

This project is a real-time chat application with a client, a server, and an AI service.

## 🚀 Deployment Guide

Your ChatSite application is ready for deployment! Here are the recommended platforms and step-by-step guides.

### 📋 Prerequisites

1. **Environment Variables** - Copy and configure:
   ```bash
   # Backend (.env in server directory)
   cp .env.example .env

   # Frontend (.env in client directory)
   cd client && cp .env.example .env
   ```

2. **Required Variables**:
   - `MONGO_URI` - MongoDB connection string
   - `JWT_SECRET` - Secure JWT secret key
   - `VITE_API_URL` - Your deployed backend URL
   - `VITE_AI_SERVICE_URL` - Your deployed AI service URL

---

## 🟢 Option 1: Vercel + Render + MongoDB Atlas (Recommended)

**Perfect combination for free deployment:**
- **Vercel**: Frontend (React) - Excellent free tier
- **Render**: Backend + AI Service - Good free tier
- **MongoDB Atlas**: Database - Free tier

### Step 1: Set Up MongoDB Atlas (Free)
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create free account and cluster
3. Get connection string
4. Whitelist all IPs (0.0.0.0.0/0)

### Step 2: Deploy Frontend to Vercel
```bash
# Build frontend
cd client/client
npm install
npm run build

# Deploy to Vercel
npm install -g vercel
vercel login
vercel --prod
```

**Or via GitHub:**
1. Push code to GitHub
2. Connect repo to Vercel
3. Set environment variables in Vercel dashboard:
   ```env
   VITE_API_URL=https://your-backend.render.com
   VITE_AI_SERVICE_URL=https://your-ai.render.com
   ```

### Step 3: Deploy Backend to Render
1. Go to [render.com](https://render.com)
2. Connect your GitHub repository
3. Create **Web Service**
4. Settings:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Starter (free)
5. Add environment variables:
   ```env
   MONGO_URI=your-mongodb-atlas-connection-string
   JWT_SECRET=your-secure-jwt-secret
   CLIENT_URL=https://your-frontend.vercel.app
   AI_SERVICE_URL=https://your-ai.render.com
   ```

### Step 4: Deploy AI Service to Render
1. Create another **Web Service**
2. Settings:
   - **Runtime**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `flask run --host=0.0.0.0 --port=$PORT`
   - **Plan**: Starter (free)
3. Add environment variables:
   ```env
   FLASK_ENV=production
   FLASK_APP=app.py
   ```

### Step 5: Update Environment Variables
1. **Frontend** (Vercel dashboard):
   ```env
   VITE_API_URL=https://your-backend-service.render.com
   VITE_AI_SERVICE_URL=https://your-ai-service.render.com
   ```
2. **Backend** (Render dashboard):
   ```env
   CLIENT_URL=https://your-frontend.vercel.app
   AI_SERVICE_URL=https://your-ai-service.render.com
   ```

---

## 💰 Free Tier Details

| Service | Platform | Limits | Cost |
|---------|----------|--------|------|
| **Frontend** | Vercel | 100GB bandwidth | $0 |
| **Backend** | Render | 512MB RAM | $0 |
| **AI Service** | Render | 512MB RAM | $0 |
| **Database** | MongoDB Atlas | 512MB storage | $0 |

---

## 🏆 Option 2: Railway (All-in-One)

Railway is still the easiest for full-stack applications with multiple services.

### Step 1: Set Up Railway CLI
```bash
npm install -g @railway/cli
railway login
```

### Step 2: Deploy All Services
```bash
cd server
railway link
railway up

cd ../ai_service
railway link --service ai-service
railway up

cd ../client/client
railway link --service frontend
railway up
```

### Step 3: Configure Environment Variables
In Railway dashboard, set:
- `MONGO_URI` - Railway provides MongoDB automatically
- `JWT_SECRET` - Generate: `openssl rand -base64 32`
- `CLIENT_URL` - Your frontend URL
- `AI_SERVICE_URL` - Your AI service URL

---

## 🐳 Option 3: Docker Compose (Self-Hosted)

For local development or self-hosted deployment:

```bash
# Build and start all services
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

---

## 🔧 Environment Variables Reference

### Backend (.env)
```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/chatdb
JWT_SECRET=your-super-secret-jwt-key-here
PORT=5000
AI_SERVICE_URL=https://your-ai-service.render.com
CLIENT_URL=https://your-frontend.vercel.app
```

### Frontend (.env)
```env
VITE_API_URL=https://your-backend.render.com
VITE_AI_SERVICE_URL=https://your-ai.render.com
```

---

## 🗄️ Database Setup

### MongoDB Atlas (Recommended)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create cluster
3. Get connection string
4. Whitelist your deployment IP (0.0.0.0.0 for most platforms)
5. Set `MONGO_URI` in environment variables

---

## 🔒 Security Checklist

- [ ] Use strong JWT secret (32+ characters)
- [ ] Set up CORS properly
- [ ] Enable HTTPS in production
- [ ] Set up database authentication
- [ ] Configure rate limiting
- [ ] Set up monitoring and logging
- [ ] Regular security updates

---

## 📈 Production Optimizations

1. **Enable Compression**: Add gzip/brotli compression
2. **Set Up Monitoring**: Use services like Sentry, LogRocket
3. **Database Indexing**: Add indexes for frequently queried fields
4. **CDN**: Use CloudFlare or similar for static assets
5. **Backup Strategy**: Regular database backups
6. **SSL Certificate**: Enable HTTPS everywhere

---

## 🆘 Troubleshooting

### Common Issues:
1. **CORS Errors**: Check `CLIENT_URL` environment variable
2. **Database Connection**: Verify `MONGO_URI` and network access
3. **Build Failures**: Check Node.js/Python versions match requirements
4. **Environment Variables**: Ensure all required variables are set

### Get Help:
- Check deployment platform logs
- Verify environment variables are loaded
- Test API endpoints individually
- Check network connectivity between services

---

## 🎯 Quick Start Commands

```bash
# Build for deployment
chmod +x deploy.sh && ./deploy.sh

# Vercel deployment
cd client/client && vercel --prod

# Manual deployment check
curl https://your-backend-url/api/health
```

Your ChatSite is now ready for the world! 🌍✨
