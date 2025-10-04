#!/bin/bash

echo "🌐 Netlify Frontend Deploy"
echo "=========================="

echo "📋 Creating netlify.toml..."
cat > netlify.toml << 'EOF'
[build]
  base = "frontend"
  command = "npm install && npm run build"
  publish = "dist"

[build.environment]
  VITE_API_URL = "https://ecommerce-backend-ygbi.onrender.com/api/v1"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
EOF

echo "✅ Netlify config created!"
echo ""
echo "🚀 Deploy options:"
echo "1. Drag & drop: Build locally, drag dist folder to netlify.com"
echo "2. GitHub: Connect repo to Netlify (auto-deploy)"
echo ""
echo "💰 Cost: $0/month (100GB bandwidth)"
echo "⚡ Auto-deploy: On git push"
echo "🔒 SSL: Included"