const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // requests per windowMs
}));

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'ecommerce_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Auth Routes
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { email, password, name, role = 'customer' } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM "Users" WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    
    const result = await pool.query(
      'INSERT INTO "Users" (id, email, password, name, role, "isActive", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW(), NOW()) RETURNING id, email, name, role',
      [email, hashedPassword, name, role]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });

    res.status(201).json({
      success: true,
      data: { user, token }
    });
  } catch (error) {
    console.error('Registration failed:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query('SELECT * FROM "Users" WHERE email = $1 AND "isActive" = true', [email]);
    const user = result.rows[0];

    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });

    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        token
      }
    });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/v1/auth/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, name, role, "createdAt" FROM "Users" WHERE id = $1', [req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get profile failed:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Product Routes
app.get('/api/v1/products', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', sortBy = 'name', sortOrder = 'asc', category = '' } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = 'SELECT * FROM "Products" WHERE "isActive" = true';
    let countQuery = 'SELECT COUNT(*) FROM "Products" WHERE "isActive" = true';
    let params = [];
    let paramCount = 0;
    
    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      countQuery += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    if (category) {
      paramCount++;
      query += ` AND category ILIKE $${paramCount}`;
      countQuery += ` AND category ILIKE $${paramCount}`;
      params.push(`%${category}%`);
    }
    
    const validSortFields = ['name', 'price', 'createdAt', 'category'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'name';
    const order = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    
    query += ` ORDER BY "${sortField}" ${order} LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), offset);

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, paramCount))
    ]);
    
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / parseInt(limit));

    res.json({
      success: true,
      data: {
        products: result.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get products failed:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/v1/products/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Products" WHERE id = $1 AND "isActive" = true', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get product failed:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

app.post('/api/v1/products', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, description, price, category, inventory, image } = req.body;

    if (!name || !description || !price || !category) {
      return res.status(400).json({ error: 'Name, description, price, and category are required' });
    }

    const result = await pool.query(
      'INSERT INTO "Products" (id, name, description, price, category, inventory, image, "isActive", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, NOW(), NOW()) RETURNING *',
      [name, description, parseFloat(price), category, parseInt(inventory) || 0, image]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create product failed:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Order Routes
app.post('/api/v1/orders', authenticateToken, async (req, res) => {
  try {
    const { items, totalAmount, shippingAddress } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' });
    }

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ error: 'Valid total amount is required' });
    }

    const result = await pool.query(
      'INSERT INTO "Orders" (id, "userId", items, "totalAmount", status, "shippingAddress", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *',
      [req.user.id, JSON.stringify(items), parseFloat(totalAmount), 'pending', JSON.stringify(shippingAddress)]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create order failed:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.get('/api/v1/orders', authenticateToken, async (req, res) => {
  try {
    let query = 'SELECT * FROM "Orders"';
    let params = [];

    if (req.user.role !== 'admin') {
      query += ' WHERE "userId" = $1';
      params.push(req.user.id);
    }

    query += ' ORDER BY "createdAt" DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get orders failed:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.get('/api/v1/orders/:id', authenticateToken, async (req, res) => {
  try {
    let query = 'SELECT * FROM "Orders" WHERE id = $1';
    let params = [req.params.id];

    if (req.user.role !== 'admin') {
      query += ' AND "userId" = $2';
      params.push(req.user.id);
    }

    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get order failed:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'ecommerce-api', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Initialize database and start server
const initializeDatabase = async () => {
  try {
    // Test connection
    await pool.query('SELECT 1');
    console.log('✅ Database connected');

    // Create demo users if they don't exist
    const demoUsers = [
      { email: 'customer@demo.com', password: 'password123', name: 'Demo Customer', role: 'customer' },
      { email: 'admin@demo.com', password: 'password123', name: 'Demo Admin', role: 'admin' }
    ];

    for (const userData of demoUsers) {
      const existing = await pool.query('SELECT id FROM "Users" WHERE email = $1', [userData.email]);
      if (existing.rows.length === 0) {
        const hashedPassword = await bcrypt.hash(userData.password, 12);
        await pool.query(
          'INSERT INTO "Users" (id, email, password, name, role, "isActive", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW(), NOW())',
          [userData.email, hashedPassword, userData.name, userData.role]
        );
        console.log(`✅ Demo user created: ${userData.email}`);
      }
    }

    // Create demo products if they don't exist
    const productCount = await pool.query('SELECT COUNT(*) FROM "Products"');
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
        await pool.query(
          'INSERT INTO "Products" (id, name, description, price, category, inventory, image, "isActive", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, NOW(), NOW())',
          [product.name, product.description, product.price, product.category, product.inventory, product.image]
        );
      }
      console.log(`✅ Created ${demoProducts.length} demo products`);
    }

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  await initializeDatabase();
  
  app.listen(PORT, () => {
    console.log(`✅ E-Commerce API Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('📊 Demo credentials:');
    console.log('  • Customer: customer@demo.com / password123');
    console.log('  • Admin: admin@demo.com / password123');
  });
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

startServer();