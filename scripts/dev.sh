#!/bin/bash

echo "🚀 Starting E-Commerce Development Environment"
echo "============================================="

# Kill existing processes
pkill -f "node.*server" 2>/dev/null

# Setup database
echo "🔧 Setting up database..."
./scripts/setup-db.sh

# Start backend server
echo "📦 Starting backend server..."
cd backend && npm run dev &
BACKEND_PID=$!
cd ..

sleep 3

echo "📦 Starting frontend..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "🌐 Development Environment Ready:"
echo "• Backend API: http://localhost:3000"
echo "• Frontend: http://localhost:3001"
echo "• Database: PostgreSQL (localhost:5432)"
echo ""
echo "🔑 Demo Credentials:"
echo "• customer@demo.com / password123"
echo "• admin@demo.com / password123"
echo ""
echo "Press Ctrl+C to stop all services"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait