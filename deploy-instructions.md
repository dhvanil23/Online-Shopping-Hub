# Free Deployment Instructions

## 1. Render (Backend + Database)
- Visit render.com
- Connect GitHub repo
- Auto-deploys using render.yaml
- Free PostgreSQL database included
- Get your backend URL: https://your-app.onrender.com

## 2. Netlify (Frontend)
- Visit netlify.com  
- Connect GitHub repo
- Build command: npm run build
- Publish directory: frontend/dist
- Auto-deploys using netlify.toml

## 3. Update URLs
After deployment:
1. Replace "your-render-app" in netlify.toml with actual Render URL
2. Replace "your-render-app" in frontend/.env.production with actual Render URL
3. Redeploy frontend

## 4. Database Setup
Render auto-creates database. No manual setup needed.

## Cost: $0/month (Free tier)