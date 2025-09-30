#!/bin/bash

# Local Testing Script for E-commerce Microservices
set -e

echo "🚀 Starting E-commerce Microservices Local Testing"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if service is running
check_service() {
    local service_name=$1
    local port=$2
    local max_attempts=30
    local attempt=1

    echo -n "Checking $service_name on port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:$port/health > /dev/null 2>&1; then
            echo -e " ${GREEN}✓${NC}"
            return 0
        fi
        sleep 2
        attempt=$((attempt + 1))
        echo -n "."
    done
    
    echo -e " ${RED}✗${NC}"
    return 1
}

# Function to test API endpoint
test_endpoint() {
    local method=$1
    local url=$2
    local data=$3
    local expected_status=$4
    
    echo -n "Testing $method $url..."
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "%{http_code}" -X $method \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$url")
    else
        response=$(curl -s -w "%{http_code}" -X $method "$url")
    fi
    
    status_code="${response: -3}"
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e " ${GREEN}✓ ($status_code)${NC}"
        return 0
    else
        echo -e " ${RED}✗ ($status_code)${NC}"
        return 1
    fi
}

# Step 1: Start infrastructure services
echo -e "\n${YELLOW}Step 1: Starting infrastructure services...${NC}"
docker-compose -f docker-compose.dev.yml up -d postgres redis rabbitmq consul

# Wait for infrastructure
echo "Waiting for infrastructure services to be ready..."
sleep 15

# Step 2: Start microservices
echo -e "\n${YELLOW}Step 2: Starting microservices...${NC}"
docker-compose -f docker-compose.dev.yml up -d

# Step 3: Health checks
echo -e "\n${YELLOW}Step 3: Performing health checks...${NC}"
sleep 20

check_service "API Gateway" 3000
check_service "Auth Service" 3001
check_service "Product Service" 3002
check_service "Order Service" 3003
check_service "Payment Service" 3004
check_service "Notification Service" 3005

# Step 4: API Testing
echo -e "\n${YELLOW}Step 4: Testing API endpoints...${NC}"

# Test user registration
test_endpoint "POST" "http://localhost:3000/api/auth/register" \
    '{"email":"test@example.com","password":"password123","role":"customer"}' \
    "201"

# Test user login
login_response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"password123"}' \
    "http://localhost:3000/api/auth/login")

token=$(echo $login_response | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$token" ]; then
    echo -e "Login successful ${GREEN}✓${NC}"
    
    # Test protected endpoint
    test_endpoint "GET" "http://localhost:3000/api/products" "" "200"
    
    # Test product creation (if admin)
    test_endpoint "POST" "http://localhost:3000/api/products" \
        '{"name":"Test Product","price":99.99,"description":"Test description","category":"electronics"}' \
        "201"
else
    echo -e "Login failed ${RED}✗${NC}"
fi

# Step 5: Service Discovery Test
echo -e "\n${YELLOW}Step 5: Testing service discovery...${NC}"
test_endpoint "GET" "http://localhost:3000/api/status" "" "200"

# Step 6: Infrastructure UI Access
echo -e "\n${YELLOW}Step 6: Infrastructure UIs available at:${NC}"
echo "• RabbitMQ Management: http://localhost:15672 (admin/password)"
echo "• Consul UI: http://localhost:8500"
echo "• Redis: localhost:6379"
echo "• PostgreSQL: localhost:5432 (postgres/password)"

# Step 7: Frontend (if available)
if [ -d "frontend" ]; then
    echo -e "\n${YELLOW}Step 7: Starting frontend...${NC}"
    cd frontend && npm install && npm run dev &
    echo "Frontend will be available at: http://localhost:5173"
    cd ..
fi

echo -e "\n${GREEN}🎉 Local testing setup complete!${NC}"
echo -e "\n${YELLOW}Available endpoints:${NC}"
echo "• API Gateway: http://localhost:3000"
echo "• Auth Service: http://localhost:3001"
echo "• Product Service: http://localhost:3002"
echo "• Order Service: http://localhost:3003"
echo "• Payment Service: http://localhost:3004"
echo "• Notification Service: http://localhost:3005"

echo -e "\n${YELLOW}To stop all services:${NC}"
echo "docker-compose -f docker-compose.dev.yml down"

echo -e "\n${YELLOW}To view logs:${NC}"
echo "docker-compose -f docker-compose.dev.yml logs -f [service-name]"