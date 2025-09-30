#!/bin/bash

# Complete E-Commerce Platform Demo Startup Script
set -e

echo "🚀 Starting E-Commerce Microservices Platform Demo"
echo "=================================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
npm install

echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
cd frontend && npm install && cd ..

echo -e "${GREEN}✅ Dependencies installed successfully!${NC}"
echo ""

echo -e "${YELLOW}🔧 Starting Services:${NC}"
echo "• API Gateway: http://localhost:3000"
echo "• Auth Service: http://localhost:3001"
echo "• Product Service: http://localhost:3002"
echo "• Frontend App: http://localhost:3001 (Vite dev server)"
echo ""

echo -e "${BLUE}🌐 Demo Credentials:${NC}"
echo "• Customer: customer@demo.com / password123"
echo "• Admin: admin@demo.com / password123"
echo ""

echo -e "${YELLOW}⚡ Starting all services...${NC}"
echo "Press Ctrl+C to stop all services"
echo ""

# Start all services concurrently
npm run dev:full