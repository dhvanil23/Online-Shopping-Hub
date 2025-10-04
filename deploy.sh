#!/bin/bash

set -e

echo "🚀 Deploying E-Commerce Platform with Redis..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Create .env if missing
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}📝 Creating .env file from example...${NC}"
    cp backend/.env.example backend/.env
    echo -e "${YELLOW}⚠️  Add your Redis URL to backend/.env for production${NC}"
fi

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Start backend
echo -e "${YELLOW}🚀 Starting backend with Redis...${NC}"
cd backend
npm start &
BACKEND_PID=$!
cd ..

# Wait and health check
echo -e "${YELLOW}⏳ Waiting for backend...${NC}"
sleep 10

for i in {1..10}; do
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend healthy${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${RED}❌ Backend failed to start${NC}"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    sleep 2
done

# Start frontend
echo -e "${YELLOW}🌐 Starting frontend...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

sleep 3

echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo ""
echo -e "${GREEN}📊 Services:${NC}"
echo "  • Backend: http://localhost:3000"
echo "  • Frontend: http://localhost:3001"
echo "  • Health: curl http://localhost:3000/health"
echo ""
echo -e "${GREEN}👤 Demo Login:${NC}"
echo "  • Customer: customer@demo.com / password123"
echo "  • Admin: admin@demo.com / password123"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"

trap "echo -e '\n${YELLOW}🛑 Stopping...${NC}'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT

wait