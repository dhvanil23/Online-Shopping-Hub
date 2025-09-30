#!/bin/bash

echo "🚀 Starting E-Commerce Production Environment"
echo "============================================"

# Kill existing processes
pkill -f "node.*server" 2>/dev/null

# Load production environment
if [ -f backend/.env ]; then
  export $(cat backend/.env | xargs)
  echo "✅ Loaded production configuration"
else
  echo "❌ backend/.env not found"
  echo "Please create backend/.env with your production credentials"
  exit 1
fi

# Start backend server
echo "📦 Starting production server..."
cd backend && npm run prod &
BACKEND_PID=$!

echo ""
echo "🌐 Production Environment:"
echo "• API Server: http://localhost:${PORT:-3000}"
echo "• Database: PostgreSQL"
echo ""
echo "Press Ctrl+C to stop"

trap "kill $BACKEND_PID 2>/dev/null; exit" INT
wait