#!/bin/bash

set -e

echo "🚀 Full Stack Deploy (Backend + Frontend)"
echo "========================================"

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "📦 Installing Netlify CLI..."
    npm install -g netlify-cli
fi

# Login to Netlify
if ! netlify status &>/dev/null; then
    echo "🔐 Login to Netlify..."
    netlify login
fi

# Build frontend
echo "🏗️ Building frontend..."
cd frontend
npm install
VITE_API_URL=https://ecommerce-backend-ygbi.onrender.com/api/v1 npm run build
cd ..

# Deploy to Netlify
echo "🌐 Deploying frontend to Netlify..."
cd frontend
netlify deploy --prod --dir=dist
SITE_URL=$(netlify status --json 2>/dev/null | jq -r '.site.url' 2>/dev/null || echo "Check Netlify dashboard for URL")
cd ..

# Create netlify.toml for future deployments
cat > netlify.toml << EOF
[build]
  base = "frontend"
  command = "npm install && npm run build"
  publish = "dist"

[build.environment]
  VITE_API_URL = "https://ecommerce-backend-ygbi.onrender.com/api/v1"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
EOF

echo ""
echo "✅ Deployment Complete!"
echo "🌐 Frontend: $SITE_URL"
echo "🔗 Backend: https://ecommerce-backend-ygbi.onrender.com"
echo "📊 API: https://ecommerce-backend-ygbi.onrender.com/api/v1"
echo ""
echo "🔐 Demo Login:"
echo "   Customer: customer@demo.com / password123"
echo "   Admin: admin@demo.com / password123"
echo ""
echo "⚠️  Next: Update CORS on Render with frontend URL: $SITE_URL"