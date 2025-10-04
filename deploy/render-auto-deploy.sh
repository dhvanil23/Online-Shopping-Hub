#!/bin/bash

set -e

echo "🎨 Render Auto-Deploy (Permanently Free)"
echo "========================================"

echo "📋 Creating render.yaml..."
cat > render.yaml << 'EOF'
services:
  - type: web
    name: ecommerce-backend
    env: node
    plan: free
    buildCommand: cd backend && npm install
    startCommand: cd backend && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: JWT_SECRET
        value: render-jwt-secret-2024-super-secure
      - key: DATABASE_URL
        fromDatabase:
          name: ecommerce-db
          property: connectionString

  - type: web
    name: ecommerce-frontend
    env: static
    plan: free
    buildCommand: cd frontend && npm install && npm run build
    staticPublishPath: frontend/dist
    envVars:
      - key: VITE_API_URL
        value: https://ecommerce-backend.onrender.com

databases:
  - name: ecommerce-db
    plan: free
    databaseName: ecommerce_db
EOF

if [ ! -d ".git" ]; then
    echo "📦 Initializing git..."
    git init
    git add .
    git commit -m "Deploy to Render"
fi

echo "✅ Ready for Render deployment!"
echo ""
echo "🚀 Next steps:"
echo "1. Go to render.com (free signup)"
echo "2. Connect GitHub repo"
echo "3. Deploy with render.yaml"
echo ""
echo "🌐 You'll get TWO URLs:"
echo "   - Frontend: https://ecommerce-frontend.onrender.com"
echo "   - Backend API: https://ecommerce-backend.onrender.com"
echo ""
echo "💰 Cost: $0/month (750 hours each service)"
echo "🗄️ PostgreSQL: Included free"
echo "⚡ Auto-deploy: On git push"
echo "🔒 SSL: Included"
echo ""
echo "🎯 Full-stack deployment on permanent free tier!"