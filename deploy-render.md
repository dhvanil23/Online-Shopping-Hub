# Deploy to Render (Manual Steps)

## 1. Create Redis Service
- Go to [Render Dashboard](https://dashboard.render.com)
- Click "New" → "Redis"
- Name: `ecommerce-redis`
- Plan: Free
- Copy the Redis URL

## 2. Update Backend Service
- Go to your existing backend service
- Environment → Add:
  ```
  REDIS_URL=redis://your-redis-url:6379
  SESSION_SECRET=your-super-secure-session-secret-key
  ```

## 3. Redeploy Backend
- Click "Manual Deploy" → "Deploy latest commit"

## 4. Test
- Check health: `https://your-backend-url.onrender.com/health`
- Should show `"redis": "connected"`

That's it! Redis is now integrated.