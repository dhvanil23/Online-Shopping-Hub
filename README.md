# Online Shopping Hub

A **production-ready, full-stack e-commerce platform** built with **React** frontend and **Node.js** backend using **MVC architecture**. This system demonstrates enterprise-level development practices with proper separation of concerns, scalable database design, and comprehensive error handling.

## 🏗️ **Architecture Overview**

### **Frontend (React)**
- **Modern React 18** with Hooks and Context API
- **Bootstrap 5** for responsive UI components
- **React Router** for client-side routing
- **Axios** for API communication
- **Vite** for fast development and building

### **Backend (Node.js)**
- **MVC Architecture** with proper separation of concerns
- **Express.js** with comprehensive middleware
- **PostgreSQL** with raw SQL queries for performance
- **JWT Authentication** with role-based access control
- **Input Validation** with express-validator
- **Security** with Helmet, CORS, and rate limiting

## 📁 **Project Structure**

```
online-shopping-hub/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React Context providers
│   │   └── services/       # API service functions
│   └── package.json
├── backend/                 # Node.js backend API
│   ├── controllers/        # Business logic controllers
│   ├── models/            # Database models
│   ├── routes/            # API route definitions
│   ├── middleware/        # Custom middleware
│   ├── config/           # Configuration files
│   └── server.js         # Application entry point
├── scripts/              # Utility scripts
└── docker-compose.yml   # Docker services
```

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 16+ and npm
- PostgreSQL 12+
- Docker (optional)

### **Installation**

1. **Clone the repository**
```bash
git clone https://github.com/dhvanil23/Online-Shopping-Hub.git
cd Online-Shopping-Hub
```

2. **Install all dependencies**
```bash
npm run install:all
```

3. **Setup database**
```bash
# Using Docker (recommended)
docker-compose up -d postgres

# Or install PostgreSQL locally and create database
createdb ecommerce_db
```

4. **Configure environment**
```bash
# Backend environment
cp backend/.env.example backend/.env
# Update database credentials in backend/.env
```

5. **Start development servers**
```bash
npm run dev
```

This will start:
- **Backend API**: http://localhost:3000
- **Frontend**: http://localhost:3001

## 🔑 **Demo Credentials**

```
Customer Account:
  Email: customer@demo.com
  Password: password123

Admin Account:
  Email: admin@demo.com
  Password: password123
```

## 📊 **Features**

### **Customer Features**
- ✅ **User Registration & Authentication**
- ✅ **Product Browsing** with search, filter, and sort
- ✅ **Shopping Cart** with local storage persistence
- ✅ **Order Management** - place and track orders
- ✅ **User Profile** management
- ✅ **Responsive Design** for all devices

### **Admin Features**
- ✅ **Product Management** - CRUD operations
- ✅ **Order Management** - view and update order status
- ✅ **User Management** - view customer accounts
- ✅ **Dashboard** with sales statistics

### **Technical Features**
- ✅ **MVC Architecture** for maintainable code
- ✅ **Role-based Access Control** (Customer/Admin)
- ✅ **Input Validation** and sanitization
- ✅ **Error Handling** with proper HTTP status codes
- ✅ **Security** - Helmet, CORS, rate limiting
- ✅ **Database Optimization** with connection pooling
- ✅ **API Documentation** with inline comments

## 🛠️ **Development**

### **Backend Development**
```bash
cd backend
npm run dev          # Start with nodemon
npm test            # Run tests
npm run test:watch  # Run tests in watch mode
```

### **Frontend Development**
```bash
cd frontend
npm run dev         # Start Vite dev server
npm run build       # Build for production
npm run preview     # Preview production build
```

### **Database Management**
```bash
# Setup database and seed data
npm run setup

# Connect to database
docker exec -it postgres psql -U postgres -d ecommerce_db
```

## 🔧 **API Endpoints**

### **Authentication**
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/profile` - Get user profile
- `POST /api/v1/auth/logout` - User logout

### **Products**
- `GET /api/v1/products` - Get products with filtering/sorting
- `GET /api/v1/products/:id` - Get single product
- `POST /api/v1/products` - Create product (Admin)
- `PUT /api/v1/products/:id` - Update product (Admin)
- `DELETE /api/v1/products/:id` - Delete product (Admin)

### **Orders**
- `POST /api/v1/orders` - Create order
- `GET /api/v1/orders` - Get user orders
- `GET /api/v1/orders/:id` - Get single order
- `PUT /api/v1/orders/:id/status` - Update order status (Admin)
- `POST /api/v1/orders/:id/cancel` - Cancel order

## 🚀 **Production Deployment**

### **Environment Variables**
```bash
# Backend (.env)
NODE_ENV=production
PORT=3000
DB_HOST=your-db-host
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password
JWT_SECRET=your-super-secure-jwt-secret
```

### **Docker Deployment**
```bash
# Build and run with Docker Compose
docker-compose up --build -d

# Or build individual services
docker build -t shopping-hub-backend ./backend
docker build -t shopping-hub-frontend ./frontend
```

### **AWS Deployment**
- **Backend**: Deploy to AWS ECS or Elastic Beanstalk
- **Frontend**: Deploy to AWS S3 + CloudFront
- **Database**: Use AWS RDS PostgreSQL
- **File Storage**: AWS S3 for product images

## 🧪 **Testing**

```bash
# Backend tests
cd backend
npm test                    # Run all tests
npm run test:coverage      # Run with coverage report

# Frontend tests (if implemented)
cd frontend
npm test
```

## 📈 **Performance Optimizations**

- **Database Connection Pooling** for efficient resource usage
- **Query Optimization** with proper indexing
- **Compression Middleware** for reduced response sizes
- **Rate Limiting** to prevent abuse
- **Frontend Code Splitting** with React.lazy
- **Image Optimization** with proper sizing and formats

## 🔒 **Security Features**

- **JWT Authentication** with secure token handling
- **Password Hashing** with bcrypt
- **Input Validation** and sanitization
- **SQL Injection Prevention** with parameterized queries
- **XSS Protection** with Helmet middleware
- **CORS Configuration** for cross-origin requests
- **Rate Limiting** to prevent brute force attacks

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 **Why This Architecture?**

### **MVC Benefits**
- **Separation of Concerns** - Models, Views, Controllers have distinct responsibilities
- **Maintainability** - Easy to modify and extend individual components
- **Testability** - Each layer can be tested independently
- **Scalability** - Clear structure supports team development

### **Technology Choices**
- **PostgreSQL** - ACID compliance, complex queries, JSON support
- **Raw SQL** - Maximum performance, no ORM overhead
- **React** - Component-based UI, excellent ecosystem
- **Express.js** - Minimal, flexible, battle-tested

This architecture is **production-ready** and suitable for **enterprise applications** with thousands of users and products.