const express = require('express');
const { Sequelize, DataTypes, Op } = require('sequelize');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('../../shared/utils/logger');
const { createSequelizeInstance } = require('../../config/database');
const { createRedisClient } = require('../../config/redis');

const app = express();
const PORT = process.env.PRODUCT_PORT || 3002;

// Security middleware
app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
}));

// Database connection
const sequelize = createSequelizeInstance();

// Redis connection (optional in development)
let redisClient = null;
try {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_REDIS === 'true') {
    redisClient = createRedisClient();
  }
} catch (error) {
  console.warn('Redis not available, continuing without cache');
}

// Product model
const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { len: [1, 200] }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: 0 }
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { len: [1, 50] }
  },
  inventory: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: { min: 0 }
  },
  sku: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  images: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  weight: {
    type: DataTypes.DECIMAL(8, 2),
    validate: { min: 0 }
  },
  dimensions: {
    type: DataTypes.JSONB
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0,
    validate: { min: 0, max: 5 }
  },
  reviewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: { min: 0 }
  }
}, {
  indexes: [
    { fields: ['category'] },
    { fields: ['isActive'] },
    { fields: ['isFeatured'] },
    { fields: ['price'] },
    { fields: ['rating'] },
    { fields: ['name'] }
  ]
});

app.use(express.json({ limit: '10mb' }));

// Cache middleware (optional)
const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    if (!redisClient) {
      return next();
    }
    
    const key = `cache:${req.originalUrl}`;
    
    try {
      const cached = await redisClient.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      
      res.sendResponse = res.json;
      res.json = (body) => {
        redisClient.setEx(key, duration, JSON.stringify(body)).catch(() => {});
        res.sendResponse(body);
      };
      
      next();
    } catch (error) {
      next();
    }
  };
};

// Routes
app.get('/api/v1/products', cacheMiddleware(300), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      search,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      featured,
      inStock
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = { isActive: true };

    // Filters
    if (category) {
      where.category = { [Op.iLike]: `%${category}%` };
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { tags: { [Op.contains]: [search] } }
      ];
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
    }

    if (featured === 'true') {
      where.isFeatured = true;
    }

    if (inStock === 'true') {
      where.inventory = { [Op.gt]: 0 };
    }

    // Sorting
    const validSortFields = ['name', 'price', 'rating', 'createdAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows: products } = await Product.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [[sortField, order]],
      attributes: { exclude: ['updatedAt'] }
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit),
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    logger.error('Get products failed:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/v1/products/:id', cacheMiddleware(600), async (req, res) => {
  try {
    const product = await Product.findOne({
      where: { id: req.params.id, isActive: true }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    logger.error('Get product failed:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

app.post('/api/v1/products', async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      inventory,
      sku,
      images,
      tags,
      weight,
      dimensions,
      isFeatured
    } = req.body;

    // Validation
    if (!name || !description || !price || !category || !sku) {
      return res.status(400).json({
        error: 'Name, description, price, category, and SKU are required'
      });
    }

    if (price <= 0) {
      return res.status(400).json({ error: 'Price must be greater than 0' });
    }

    // Check if SKU already exists
    const existingProduct = await Product.findOne({ where: { sku } });
    if (existingProduct) {
      return res.status(409).json({ error: 'SKU already exists' });
    }

    const product = await Product.create({
      name,
      description,
      price: parseFloat(price),
      category,
      inventory: parseInt(inventory) || 0,
      sku,
      images: images || [],
      tags: tags || [],
      weight: weight ? parseFloat(weight) : null,
      dimensions,
      isFeatured: isFeatured || false
    });

    // Clear cache
    await redisClient.del('cache:/api/v1/products*');

    logger.info(`Product created: ${name} (${sku})`);

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    logger.error('Create product failed:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.put('/api/v1/products/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updatedProduct = await product.update(req.body);

    // Clear cache
    await redisClient.del(`cache:/api/v1/products/${req.params.id}`);
    await redisClient.del('cache:/api/v1/products*');

    logger.info(`Product updated: ${updatedProduct.name}`);

    res.json({
      success: true,
      data: updatedProduct
    });
  } catch (error) {
    logger.error('Update product failed:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.delete('/api/v1/products/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Soft delete
    await product.update({ isActive: false });

    // Clear cache
    await redisClient.del(`cache:/api/v1/products/${req.params.id}`);
    await redisClient.del('cache:/api/v1/products*');

    logger.info(`Product deleted: ${product.name}`);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    logger.error('Delete product failed:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Inventory management
app.post('/api/v1/products/:id/reserve', async (req, res) => {
  try {
    const { quantity } = req.body;
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.inventory < quantity) {
      return res.status(400).json({ error: 'Insufficient inventory' });
    }

    await product.update({
      inventory: product.inventory - quantity
    });

    res.json({
      success: true,
      data: { remainingInventory: product.inventory - quantity }
    });
  } catch (error) {
    logger.error('Reserve inventory failed:', error);
    res.status(500).json({ error: 'Failed to reserve inventory' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'product-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Start service
const startService = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    
    // Connect Redis if available
    if (redisClient) {
      try {
        await redisClient.connect();
        console.log('✅ Redis connected');
      } catch (error) {
        console.warn('⚠️ Redis connection failed, continuing without cache');
        redisClient = null;
      }
    }

    // Create demo products
    const demoProducts = [
      {
        name: 'Wireless Headphones',
        description: 'Premium noise-cancelling wireless headphones with 30-hour battery life',
        price: 199.99,
        category: 'Electronics',
        inventory: 50,
        sku: 'WH-001',
        images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300'],
        tags: ['wireless', 'headphones', 'audio'],
        isFeatured: true,
        rating: 4.5,
        reviewCount: 128
      },
      {
        name: 'Smart Watch',
        description: 'Advanced fitness tracking smartwatch with heart rate monitor',
        price: 299.99,
        category: 'Electronics',
        inventory: 30,
        sku: 'SW-001',
        images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300'],
        tags: ['smartwatch', 'fitness', 'wearable'],
        isFeatured: true,
        rating: 4.3,
        reviewCount: 89
      },
      {
        name: 'Coffee Maker',
        description: 'Programmable drip coffee maker with thermal carafe',
        price: 89.99,
        category: 'Home',
        inventory: 25,
        sku: 'CM-001',
        images: ['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300'],
        tags: ['coffee', 'kitchen', 'appliance'],
        rating: 4.2,
        reviewCount: 67
      }
    ];

    for (const productData of demoProducts) {
      const existingProduct = await Product.findOne({ where: { sku: productData.sku } });
      if (!existingProduct) {
        await Product.create(productData);
        logger.info(`Demo product created: ${productData.name}`);
      }
    }

    app.listen(PORT, () => {
      logger.info(`Product Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Product service startup failed:', error);
    process.exit(1);
  }
};

startService();