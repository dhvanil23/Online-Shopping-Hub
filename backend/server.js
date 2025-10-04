require('dotenv').config();
const app = require('./app');
const db = require('./config/database');
const bcrypt = require('bcryptjs');

const PORT = process.env.PORT || 3000;

// Initialize database and seed data
const initializeDatabase = async () => {
  try {
    // Test database connection
    await db.query('SELECT 1');
    if (process.env.NODE_ENV !== 'production') console.log('✅ Database connected successfully');

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

    // Create demo products if they don't exist
    const productCount = await db.query('SELECT COUNT(*) FROM "Products"');
    if (parseInt(productCount.rows[0].count) === 0) {
      const demoProducts = [
        { name: 'Wireless Headphones', description: 'Premium noise-cancelling wireless headphones with 30-hour battery life', price: 199.99, category: 'Electronics', inventory: 50, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop' },
        { name: 'Smart Watch', description: 'Advanced fitness tracking smartwatch with heart rate monitor', price: 299.99, category: 'Electronics', inventory: 30, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=200&fit=crop' },
        { name: 'Coffee Maker', description: 'Programmable drip coffee maker with thermal carafe', price: 89.99, category: 'Home', inventory: 25, image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300&h=200&fit=crop' },
        { name: 'Running Shoes', description: 'Lightweight running shoes with responsive cushioning', price: 129.99, category: 'Sports', inventory: 40, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=200&fit=crop' },
        { name: 'Laptop Backpack', description: 'Water-resistant laptop backpack with USB charging port', price: 59.99, category: 'Accessories', inventory: 60, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=200&fit=crop' },
        { name: 'Bluetooth Speaker', description: 'Waterproof portable speaker with 360-degree sound', price: 79.99, category: 'Electronics', inventory: 35, image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=300&h=200&fit=crop' },
        { name: 'Yoga Mat', description: 'Non-slip eco-friendly yoga mat with carrying strap', price: 39.99, category: 'Sports', inventory: 45, image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=300&h=200&fit=crop' },
        { name: 'Desk Lamp', description: 'LED desk lamp with adjustable brightness and USB charging', price: 49.99, category: 'Home', inventory: 30, image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=300&h=200&fit=crop' },
        { name: 'Wireless Mouse', description: 'Ergonomic wireless mouse with precision tracking', price: 29.99, category: 'Electronics', inventory: 80, image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=300&h=200&fit=crop' },
        { name: 'Water Bottle', description: 'Insulated stainless steel water bottle keeps drinks cold 24hrs', price: 24.99, category: 'Sports', inventory: 100, image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=300&h=200&fit=crop' },
        { name: 'Phone Case', description: 'Shockproof phone case with wireless charging compatibility', price: 19.99, category: 'Accessories', inventory: 150, image: 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=300&h=200&fit=crop' },
        { name: 'Gaming Keyboard', description: 'Mechanical gaming keyboard with RGB backlighting', price: 149.99, category: 'Electronics', inventory: 25, image: 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=300&h=200&fit=crop' }
      ];

      for (const product of demoProducts) {
        await db.query(
          'INSERT INTO "Products" (id, name, description, price, category, inventory, image, "isActive", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, NOW(), NOW())',
          [product.name, product.description, product.price, product.category, product.inventory, product.image]
        );
      }
      if (process.env.NODE_ENV !== 'production') console.log(`✅ Created ${demoProducts.length} demo products`);
    }

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  await initializeDatabase();
  
  const server = app.listen(PORT, () => {
    console.log(`✅ E-Commerce API Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log('📊 Demo credentials:');
    console.log('  • Customer: customer@demo.com / password123');
    console.log('  • Admin: admin@demo.com / password123');
  });

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