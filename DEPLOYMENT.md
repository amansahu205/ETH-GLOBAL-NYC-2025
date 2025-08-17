# Sentinel - Deployment Guide

## 🚀 Vercel Frontend Deployment

### 1. Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from web directory
cd web
vercel --prod
```

### 2. Environment Variables
Set these in Vercel dashboard:
- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID=ee0c9281-4ef8-4bc2-a2ab-97ac5e0be367`
- `NEXT_PUBLIC_API_BASE_URL=https://your-backend-url.com`

## 🔧 Backend Deployment Options

### Option 1: Railway (Recommended)
1. Connect GitHub repo to Railway
2. Deploy from `/backend` directory
3. Set environment variables:
   - `PORT=8000`
   - Add any other environment variables needed

### Option 2: Render
1. Connect GitHub repo to Render
2. Set build command: `pip install -r requirements.txt`
3. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Option 3: Heroku
1. Create `Procfile` in backend directory:
   ```
   web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
2. Deploy via Heroku CLI or GitHub integration

## 📝 Frontend Environment Variables for Production

Update `NEXT_PUBLIC_API_BASE_URL` to your deployed backend URL:
- Local: `http://localhost:8000`
- Production: `https://your-backend-url.com`

## 🔗 CORS Configuration

The backend is configured to allow all origins for demo purposes. For production, update the CORS origins in `backend/app/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-url.vercel.app"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 🎯 Quick Deploy Commands

```bash
# Frontend (from web directory)
vercel --prod

# Backend (depends on platform)
git push heroku main  # Heroku
# or use Railway/Render GitHub integration
```

## 🏆 ETHGlobal Demo URLs
- Frontend: https://your-app.vercel.app
- Backend: https://your-backend.railway.app
- GitHub: https://github.com/amansahu205/ETH-GLOBAL-NYC-2025