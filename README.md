# Enterprise E-Commerce Microservices Platform

A **production-ready, distributed e-commerce platform** built with **microservices architecture**, demonstrating enterprise-level backend development skills. This system showcases **fault tolerance**, **scalability**, **event-driven architecture**, and **cloud-native deployment** on AWS with Kubernetes orchestration.

## 🏗️ **Microservices Architecture**

This platform implements a **true microservices architecture** with:
- **6 Independent Services** with separate databases
- **Event-Driven Communication** via RabbitMQ
- **Service Discovery** with Consul
- **API Gateway** with circuit breakers and load balancing
- **Distributed Caching** with Redis
- **Real-time Notifications** with WebSockets

## 🚀 **Microservices & Features**

### **Service Architecture**

#### 🔐 **Auth Service** (Port 3001)
- JWT authentication with refresh tokens
- Role-based access control (Customer, Admin, Vendor)
- User registration and email verification
- Session management with Redis
- Password reset functionality

#### 📎 **Product Service** (Port 3002)
- Product catalog management
- Advanced search and filtering
- Inventory tracking and reservation
- Redis caching for performance
- Category management

#### 📝 **Order Service** (Port 3003)
- Order lifecycle management
- Saga pattern for distributed transactions
- Integration with Product and Payment services
- Order status tracking
- Inventory coordination

#### 💳 **Payment Service** (Port 3004)
- Stripe payment processing
- Payment intent management
- Webhook handling for payment events
- Refund processing
- PCI compliance

#### 🔔 **Notification Service** (Port 3005)
- Real-time WebSocket notifications
- Email notifications (welcome, order updates)
- Event-driven messaging
- Multi-channel communication

#### 🌐 **API Gateway** (Port 3000)
- Single entry point for all services
- Dynamic service discovery
- Circuit breaker pattern
- Rate limiting and security
- Load balancing

### **Enterprise Technologies**
- **Microservices**: Independent, scalable services
- **Event-Driven**: RabbitMQ for async communication
- **Service Discovery**: Consul for service registration
- **Caching**: Redis for distributed caching
- **Monitoring**: Prometheus + Grafana
- **Orchestration**: Kubernetes with auto-scaling
- **Cloud**: AWS EKS, RDS, ElastiCache
- **Infrastructure**: Terraform for IaC
- **CI/CD**: Docker containerization
- **Observability**: Distributed tracing with Jaeger

## 🏗️ **Distributed System Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │────│   API Gateway   │────│  Service Mesh   │
│   (AWS ALB)     │    │  (Port 3000)    │    │   (Consul)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
        ┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
        │ Auth Service │ │Product Svc  │ │Order Svc   │
        │ (Port 3001)  │ │(Port 3002)  │ │(Port 3003) │
        └──────────────┘ └─────────────┘ └────────────┘
                │               │               │
        ┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
        │Payment Svc   │ │Notification │ │   Events   │
        │(Port 3004)   │ │(Port 3005)  │ │ (RabbitMQ) │
        └──────────────┘ └─────────────┘ └────────────┘
                │               │               │
        ┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
        │ PostgreSQL   │ │    Redis    │ │Monitoring  │
        │   (RDS)      │ │(ElastiCache)│ │(Prometheus)│
        └──────────────┘ └─────────────┘ └────────────┘
```

### **Service Communication**
- **Synchronous**: HTTP/REST via API Gateway
- **Asynchronous**: Event-driven via RabbitMQ
- **Service Discovery**: Consul for dynamic routing
- **Circuit Breakers**: Fault tolerance patterns
- **Caching**: Redis for distributed caching

## 🚀 **Production AWS Deployment**

### **Prerequisites**
```bash
# Install required tools
brew install awscli terraform kubectl docker

# Configure AWS credentials
aws configure

# Verify prerequisites
./scripts/deploy-aws.sh prereq
```

### **Complete AWS Deployment**
```bash
# Deploy entire platform to AWS
./scripts/deploy-aws.sh all

# This will:
# 1. Create VPC, EKS, RDS Aurora, ElastiCache
# 2. Build and push Docker images to ECR
# 3. Deploy microservices to EKS
# 4. Configure monitoring and logging
```

### **Step-by-Step Deployment**
```bash
# 1. Deploy AWS infrastructure
./scripts/deploy-aws.sh infra

# 2. Build and push images
./scripts/deploy-aws.sh images

# 3. Deploy to Kubernetes
./scripts/deploy-aws.sh k8s
```

### **Complete Platform Demo**
```bash
# Quick start - Full platform with UI
./scripts/start-demo.sh

# Or manually:
npm install
npm run frontend:install
npm run dev:full

# Access:
# Frontend: http://localhost:3001
# API Gateway: http://localhost:3000
# Backend Services: 3001-3005
```

### **Demo Credentials**
```
Customer Account:
  Email: customer@demo.com
  Password: password123

Admin Account:
  Email: admin@demo.com
  Password: password123
```

### **AWS Resources Created**
- **EKS Cluster** - Kubernetes orchestration
- **RDS Aurora PostgreSQL** - Multi-AZ database cluster
- **ElastiCache Redis** - Distributed caching
- **Application Load Balancer** - Traffic distribution
- **ECR Repositories** - Container image storage
- **VPC with 3 AZs** - Network isolation
- **CloudWatch** - Monitoring and logging
- **IAM Roles** - Security and permissions

## 📚 API Documentation

Once the server is running, visit:
- **API Documentation**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health

### Key Endpoints

#### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh-token` - Refresh JWT token
- `GET /api/v1/auth/profile` - Get user profile

#### Products
- `GET /api/v1/products` - List products with filtering
- `GET /api/v1/products/:id` - Get product details
- `POST /api/v1/products` - Create product (Admin/Vendor)
- `PUT /api/v1/products/:id` - Update product
- `DELETE /api/v1/products/:id` - Delete product

#### Orders
- `POST /api/v1/orders` - Create order
- `GET /api/v1/orders` - Get user orders
- `GET /api/v1/orders/:id` - Get order details
- `PUT /api/v1/orders/:id/status` - Update order status (Admin)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🔒 Security Features

- **JWT Authentication** with refresh tokens
- **Rate Limiting** to prevent abuse
- **Input Validation** using Joi and express-validator
- **SQL Injection Protection** via Sequelize ORM
- **XSS Protection** with Helmet middleware
- **CORS Configuration** for cross-origin requests
- **Password Hashing** using bcrypt
- **Environment Variables** for sensitive data

## 📊 Performance Optimizations

- **Redis Caching** for frequently accessed data
- **Database Indexing** for optimized queries
- **Connection Pooling** for database connections
- **Compression Middleware** for response optimization
- **Pagination** for large datasets
- **Lazy Loading** for related data

## 🚀 Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates installed
- [ ] Monitoring setup (logs, metrics)
- [ ] Backup strategy implemented
- [ ] Load balancer configured

### Docker Production Deployment
```bash
# Build production image
docker build -t ecommerce-backend:prod .

# Run with production environment
docker run -d \
  --name ecommerce-backend \
  -p 3000:3000 \
  --env-file .env.production \
  ecommerce-backend:prod
```

## 📈 Monitoring & Logging

- **Winston Logger** for structured logging
- **Health Check Endpoint** for monitoring
- **Error Tracking** with detailed error logs
- **Performance Metrics** via middleware
- **Database Query Logging** in development

## 🔧 Development Tools

- **Nodemon** for auto-restart during development
- **ESLint** for code linting
- **Prettier** for code formatting
- **Jest** for testing
- **Swagger** for API documentation
- **Sequelize CLI** for database operations

## 📝 Environment Variables

Key environment variables (see `.env.example`):

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_NAME=ecommerce_db
REDIS_HOST=localhost
JWT_SECRET=your-secret-key
STRIPE_SECRET_KEY=your-stripe-key
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run tests and linting
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 **Enterprise Features Demonstrated**

### **Microservices Patterns**
- ✅ **API Gateway Pattern** - Single entry point with routing
- ✅ **Service Discovery** - Dynamic service registration with Consul
- ✅ **Circuit Breaker** - Fault tolerance and resilience
- ✅ **Saga Pattern** - Distributed transaction management
- ✅ **Event Sourcing** - Event-driven architecture with RabbitMQ
- ✅ **CQRS** - Command Query Responsibility Segregation

### **Scalability & Performance**
- ✅ **Horizontal Scaling** - Kubernetes auto-scaling
- ✅ **Load Balancing** - AWS ALB with health checks
- ✅ **Caching Strategy** - Redis distributed caching
- ✅ **Database Optimization** - Connection pooling, indexing
- ✅ **CDN Integration** - Cloudinary for static assets

### **DevOps & Infrastructure**
- ✅ **Infrastructure as Code** - Terraform for AWS resources
- ✅ **Container Orchestration** - Kubernetes with Helm charts
- ✅ **CI/CD Pipeline** - Docker multi-stage builds
- ✅ **Monitoring & Alerting** - Prometheus + Grafana
- ✅ **Distributed Tracing** - Jaeger for request tracking
- ✅ **Centralized Logging** - ELK stack integration

### **Security & Compliance**
- ✅ **Zero Trust Architecture** - Service-to-service authentication
- ✅ **OAuth 2.0 / JWT** - Stateless authentication
- ✅ **Rate Limiting** - DDoS protection
- ✅ **Input Validation** - SQL injection prevention
- ✅ **Secrets Management** - Kubernetes secrets
- ✅ **PCI Compliance** - Secure payment processing

### **Data Management**
- ✅ **Database per Service** - Data isolation
- ✅ **Event-Driven Updates** - Eventual consistency
- ✅ **Backup & Recovery** - Automated RDS backups
- ✅ **Data Encryption** - At rest and in transit

## 💼 **Resume Impact**

This project showcases **senior-level backend engineering** skills:

• **Distributed Systems Design** - Microservices with proper boundaries
• **Cloud Architecture** - AWS-native with managed services
• **Event-Driven Architecture** - Async communication patterns
• **Production Readiness** - Monitoring, logging, alerting
• **Scalability Engineering** - Auto-scaling, load balancing
• **DevOps Integration** - IaC, containerization, orchestration

Perfect for **Staff Engineer**, **Principal Engineer**, or **Solutions Architect** roles!