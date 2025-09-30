#!/bin/bash

echo "🚀 Starting E-Commerce Production Environment"
echo "============================================"

# Kill existing processes
pkill -f "node.*services" 2>/dev/null
pkill -f "node.*server" 2>/dev/null

# Load production environment
if [ -f .env.production ]; then
  export $(cat .env.production | xargs)
  echo "✅ Loaded production configuration"
else
  echo "❌ .env.production not found"
  echo "Please create .env.production with your AWS RDS/ElastiCache credentials"
  exit 1
fi

# Start services
echo "📦 Starting production services..."
node services/auth-service/index.js &
AUTH_PID=$!

node services/product-service/index.js &
PRODUCT_PID=$!

sleep 5

node services/api-gateway/index.js &
GATEWAY_PID=$!

echo ""
echo "🌐 Production Environment:"
echo "• API Gateway: http://localhost:${API_GATEWAY_PORT:-3000}"
echo "• Database: AWS RDS PostgreSQL"
echo "• Cache: AWS ElastiCache Redis"
echo ""
echo "Press Ctrl+C to stop"

trap "kill $AUTH_PID $PRODUCT_PID $GATEWAY_PID 2>/dev/null; exit" INT
wait