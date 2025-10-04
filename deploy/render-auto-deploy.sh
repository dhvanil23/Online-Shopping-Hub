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

databases:
  - name: ecommerce-db
    plan: free
    databaseName: ecommerce_db
    user: postgres
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
echo "💰 Cost: $0/month (750 hours free)"
echo "🗄️ PostgreSQL: Included free"
echo "⚡ Auto-deploy: On git push"
echo "🔒 SSL: Included"
echo ""
echo "🎯 Truly permanent free tier!"