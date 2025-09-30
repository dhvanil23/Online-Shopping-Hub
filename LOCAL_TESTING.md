# Local Testing Guide

## Prerequisites

Ensure you have the following installed:
- **Docker** (v20+) and **Docker Compose** (v2+)
- **Node.js** (v18+) and **npm**
- **curl** (for API testing)

## Quick Start

### 1. Clone and Setup
```bash
git clone <repository-url>
cd scalable-ecommerce-backend
cp .env.local .env
```

### 2. Start All Services
```bash
# Option A: Using Docker Compose (Recommended)
docker-compose -f docker-compose.dev.yml up -d

# Option B: Using npm scripts
npm install
npm run dev

# Option C: Using test script
./scripts/test-local.sh
```

### 3. Verify Services
```bash
# Check all services are running
curl http://localhost:3000/health
curl http://localhost:3000/api/status
```

## Service Endpoints

| Service | Port | Health Check | Purpose |
|---------|------|--------------|---------|
| API Gateway | 3000 | `/health` | Single entry point, routing |
| Auth Service | 3001 | `/health` | Authentication, JWT tokens |
| Product Service | 3002 | `/health` | Product catalog, inventory |
| Order Service | 3003 | `/health` | Order management, saga |
| Payment Service | 3004 | `/health` | Stripe payments, webhooks |
| Notification Service | 3005 | `/health` | Email, WebSocket notifications |

## Infrastructure Services

| Service | Port | UI/Access | Credentials |
|---------|------|-----------|-------------|
| PostgreSQL | 5432 | CLI/GUI tools | postgres/password |
| Redis | 6379 | CLI | No auth |
| RabbitMQ | 5672, 15672 | http://localhost:15672 | admin/password |
| Consul | 8500 | http://localhost:8500 | No auth |

## API Testing

### Authentication Flow
```bash
# 1. Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","role":"customer"}'

# 2. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 3. Use token for protected routes
TOKEN="your-jwt-token"
curl -X GET http://localhost:3000/api/products \
  -H "Authorization: Bearer $TOKEN"
```

### Product Management
```bash
# Create product (admin/vendor only)
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Product",
    "price": 99.99,
    "description": "Test description",
    "category": "electronics",
    "stock": 100
  }'

# Get products
curl http://localhost:3000/api/products

# Get product by ID
curl http://localhost:3000/api/products/1
```

### Order Flow
```bash
# Create order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "items": [
      {"productId": 1, "quantity": 2, "price": 99.99}
    ],
    "shippingAddress": {
      "street": "123 Main St",
      "city": "Anytown",
      "state": "CA",
      "zipCode": "12345"
    }
  }'

# Get user orders
curl -X GET http://localhost:3000/api/orders \
  -H "Authorization: Bearer $TOKEN"
```

## Development Workflow

### Running Individual Services
```bash
# Start infrastructure only
docker-compose -f docker-compose.dev.yml up -d postgres redis rabbitmq consul

# Run services locally with hot reload
npm run dev:auth      # Port 3001
npm run dev:product   # Port 3002
npm run dev:order     # Port 3003
npm run dev:payment   # Port 3004
npm run dev:gateway   # Port 3000

# Or run all at once
npm run dev
```

### Debugging
```bash
# View logs
docker-compose -f docker-compose.dev.yml logs -f auth-service
docker-compose -f docker-compose.dev.yml logs -f api-gateway

# Connect to database
docker exec -it scalable-ecommerce-backend_postgres_1 psql -U postgres -d ecommerce_db

# Connect to Redis
docker exec -it scalable-ecommerce-backend_redis_1 redis-cli
```

### Testing
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific service tests
npm test -- services/auth-service
```

## Frontend Integration

If you have the frontend:
```bash
# Install frontend dependencies
npm run frontend:install

# Start frontend dev server
npm run frontend:dev

# Run full stack (backend + frontend)
npm run dev:full
```

Access frontend at: http://localhost:5173

## Monitoring & Observability

### Service Discovery
- Consul UI: http://localhost:8500
- View registered services and health checks

### Message Queue
- RabbitMQ Management: http://localhost:15672
- Monitor queues, exchanges, and message flow

### Database
```bash
# Connect to PostgreSQL
docker exec -it scalable-ecommerce-backend_postgres_1 psql -U postgres -d ecommerce_db

# View tables
\dt

# Check user data
SELECT * FROM "Users";
```

## Troubleshooting

### Common Issues

1. **Port conflicts**
   ```bash
   # Check what's using ports
   lsof -i :3000
   lsof -i :5432
   
   # Kill processes if needed
   kill -9 <PID>
   ```

2. **Database connection issues**
   ```bash
   # Reset database
   docker-compose -f docker-compose.dev.yml down -v
   docker-compose -f docker-compose.dev.yml up -d postgres
   ```

3. **Service discovery issues**
   ```bash
   # Check Consul
   curl http://localhost:8500/v1/health/state/any
   
   # Restart services
   docker-compose -f docker-compose.dev.yml restart
   ```

4. **Memory issues**
   ```bash
   # Check Docker resources
   docker system df
   docker system prune
   ```

### Clean Reset
```bash
# Stop all services and remove volumes
docker-compose -f docker-compose.dev.yml down -v

# Remove all containers and images
docker system prune -a

# Restart fresh
docker-compose -f docker-compose.dev.yml up -d
```

## Performance Testing

### Load Testing with curl
```bash
# Simple load test
for i in {1..100}; do
  curl -s http://localhost:3000/api/products > /dev/null &
done
wait
```

### Using Apache Bench
```bash
# Install ab (Apache Bench)
brew install httpd  # macOS

# Test API Gateway
ab -n 1000 -c 10 http://localhost:3000/health

# Test with authentication
ab -n 100 -c 5 -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/products
```

## Environment Variables

Copy `.env.local` to `.env` and update:
- Stripe keys (get from Stripe dashboard)
- Email credentials (Gmail app password)
- Cloudinary credentials (for image uploads)
- JWT secret (generate strong secret)

## Next Steps

1. **Production Deployment**: Use `./scripts/deploy-aws.sh`
2. **Kubernetes**: Apply manifests in `infrastructure/kubernetes/`
3. **Monitoring**: Set up Prometheus + Grafana
4. **CI/CD**: Configure GitHub Actions or similar