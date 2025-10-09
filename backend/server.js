require('dotenv').config();
const app = require('./app');
const db = require('./config/database');
const redis = require('./config/redis');
const bcrypt = require('bcryptjs');
const { createServer } = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;

// Initialize database and seed data
const initializeDatabase = async () => {
  try {
    // Test database connection
    await db.query('SELECT 1');
    if (process.env.NODE_ENV !== 'production') console.log('✅ Database connected successfully');

    // Initialize Redis connection
    await redis.connect();

    // Create tables if they don't exist
    await db.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      
      CREATE TABLE IF NOT EXISTS "Users" (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'customer',
          "isActive" BOOLEAN DEFAULT true,
          "lastLogin" TIMESTAMP,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS "Products" (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL,
          category VARCHAR(100),
          inventory INTEGER DEFAULT 0,
          image VARCHAR(500),
          "isActive" BOOLEAN DEFAULT true,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS "Orders" (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "userId" UUID NOT NULL REFERENCES "Users"(id),
          items JSONB NOT NULL,
          "totalAmount" DECIMAL(10,2) NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          "shippingAddress" JSONB,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS "Reviews" (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "userId" UUID NOT NULL REFERENCES "Users"(id),
          "productId" UUID NOT NULL REFERENCES "Products"(id),
          rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
          comment TEXT,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW(),
          UNIQUE("userId", "productId")
      );
    `);
    console.log('✅ Database tables created');

    // Create demo users if they don't exist
    const demoUsers = [
      { email: 'customer@demo.com', password: 'password123', name: 'Demo Customer', role: 'customer' },
      { email: 'admin@demo.com', password: 'password123', name: 'Demo Admin', role: 'admin' }
    ];

    for (const userData of demoUsers) {
      const existing = await db.query('SELECT id FROM "Users" WHERE email = $1', [userData.email]);
      if (existing.rows.length === 0) {
        const hashedPassword = await bcrypt.hash(userData.password, 12);
        await db.query(
          'INSERT INTO "Users" (id, email, password, name, role, "isActive", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW(), NOW())',
          [userData.email, hashedPassword, userData.name, userData.role]
        );
        if (process.env.NODE_ENV !== 'production') console.log(`✅ Demo user created: ${userData.email}`);
      }
    }

    // Create large product dataset if no products exist
    const productCount = await db.query('SELECT COUNT(*) FROM "Products"');
    if (parseInt(productCount.rows[0].count) === 0) {
      console.log('🌱 Seeding large product dataset...');
      
      const categories = ['Electronics', 'Clothing', 'Home', 'Sports', 'Books', 'Beauty', 'Automotive', 'Toys'];
      const brands = ['Apple', 'Samsung', 'Nike', 'Adidas', 'Sony', 'LG', 'Canon', 'Dell', 'HP', 'Microsoft'];
      
      const BATCH_SIZE = 100;
      const TOTAL_PRODUCTS = 2000;
      
      for (let i = 0; i < TOTAL_PRODUCTS; i += BATCH_SIZE) {
        const batch = [];
        const values = [];
        
        for (let j = 0; j < BATCH_SIZE && (i + j) < TOTAL_PRODUCTS; j++) {
          const productId = i + j + 1;
          batch.push(`(gen_random_uuid(), $${j * 6 + 1}, $${j * 6 + 2}, $${j * 6 + 3}, $${j * 6 + 4}, $${j * 6 + 5}, $${j * 6 + 6}, true, NOW(), NOW())`);
          values.push(
            `Product ${productId} - ${brands[Math.floor(Math.random() * brands.length)]}`,
            `High-quality product with premium features. Perfect for everyday use. Product ID: ${productId}`,
            Math.floor(Math.random() * 50000) + 199,
            categories[Math.floor(Math.random() * categories.length)],
            Math.floor(Math.random() * 200) + 5,
            `https://picsum.photos/300/200?random=${productId}`
          );
        }
        
        const query = `INSERT INTO "Products" (id, name, description, price, category, inventory, image, "isActive", "createdAt", "updatedAt") VALUES ${batch.join(', ')}`;
        await db.query(query, values);
      }
      
      console.log(`✅ Seeded ${TOTAL_PRODUCTS} products for e-commerce scale`);
    }

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  await initializeDatabase();
  
  const server = createServer(app);
  
  // Setup WebSocket
  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? "https://eshopping-hub.netlify.app" 
        : "http://localhost:3001",
      methods: ["GET", "POST"]
    }
  });

  // WebSocket connection handling
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('joinProduct', (productId) => {
      socket.join(`product_${productId}`);
    });
    
    socket.on('joinUser', (userId) => {
      socket.join(`user_${userId}`);
    });
    
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  // Make io available to routes
  app.set('io', io);
  
  server.listen(PORT, () => {
    console.log(`✅ E-Commerce API Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔌 WebSocket server running`);
    console.log('📊 Demo credentials:');
    console.log('  • Customer: customer@demo.com / password123');
    console.log('  • Admin: admin@demo.com / password123');
  });

  return server;

  // Handle server errors
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
      process.exit(1);
    } else {
      console.error('❌ Server error:', error);
      process.exit(1);
    }
  });

  return server;
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();