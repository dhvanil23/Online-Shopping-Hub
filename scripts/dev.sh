#!/bin/bash

echo "🚀 Starting E-Commerce Development Environment"
echo "============================================="

# Kill existing processes
pkill -f "node.*services" 2>/dev/null
pkill -f "node.*server" 2>/dev/null

# Load environment
export $(cat .env.development | xargs) 2>/dev/null || echo "Using default environment"

# Setup database
echo "🔧 Setting up database..."
./scripts/setup-db.sh

# Start final server (no ORM)
echo "📦 Starting E-Commerce API Server..."
node server.js &
SERVER_PID=$!

sleep 3

echo "📦 Starting frontend..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "🌐 Development Environment Ready:"
echo "• Frontend: http://localhost:3001"
echo "• API Gateway: http://localhost:3000"
echo "• Database: PostgreSQL (localhost:5432)"
echo ""
echo "🔑 Login Credentials:"
echo "• customer@demo.com / password123"
echo "• admin@demo.com / password123"
echo ""
echo "Press Ctrl+C to stop"

trap "kill $SERVER_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait