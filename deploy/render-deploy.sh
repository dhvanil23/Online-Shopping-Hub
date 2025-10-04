#!/bin/bash

set -e

echo "🎨 Render Auto-Deploy (100% Free)"
echo "=================================="

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
        value: super-secure-jwt-secret-key-2024
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

# Check if git repo exists
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit"
fi

echo "✅ Ready for deployment!"
echo ""
echo "🚀 Next: Go to render.com and:"
echo "1. Create account (free)"
echo "2. Connect GitHub repo"
echo "3. Deploy with render.yaml"
echo ""
echo "💰 Cost: $0/month (750 hours free)"
echo "🗄️ Database: PostgreSQL included"
echo "⚡ Auto-deploy: On git push"