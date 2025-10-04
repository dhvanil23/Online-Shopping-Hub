#!/bin/bash

set -e

echo "🚂 Railway Auto-Deploy (PostgreSQL + Redis)"
echo "==========================================="

if ! command -v railway &> /dev/null; then
    npm install -g @railway/cli
fi

if ! railway whoami &>/dev/null; then
    railway login
fi

railway init
railway add postgresql
railway add redis

railway variables set NODE_ENV=production
railway variables set JWT_SECRET=railway-jwt-$(date +%s)
railway variables set PORT=3000

echo "🚀 Deploying..."
cd backend && railway up --detach && cd ..

sleep 45

URL=$(railway domain 2>/dev/null || echo "Check Railway dashboard")

echo ""
echo "✅ Deployed!"
echo "🌐 App: $URL"
echo "🗄️ PostgreSQL + Redis: Auto-connected"
echo "💰 Cost: $0"
echo "Demo: customer@demo.com / password123"