const express = require('express');
const { Sequelize, DataTypes, Op } = require('sequelize');
const redis = require('redis');
const eventBus = require('../../shared/events/eventBus');
const serviceRegistry = require('../../shared/utils/serviceRegistry');
const logger = require('../../shared/utils/logger');

const app = express();
const PORT = process.env.PRODUCT_PORT || 3002;

// Database setup
const sequelize = new Sequelize(process.env.PRODUCT_DB_URL || 'postgres://postgres:password@localhost:5432/product_db', {
  logging: false
});

// Product model
const Product = sequelize.define('Product', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  inventory: { type: DataTypes.INTEGER, defaultValue: 0 },
  sku: { type: DataTypes.STRING, unique: true },
  category: { type: DataTypes.STRING },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});

// Redis client for caching
const redisClient = redis.createClient({ url: process.env.REDIS_URL });

app.use(express.json());

// Product endpoints
app.get('/products', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, search, minPrice, maxPrice } = req.query;
    const offset = (page - 1) * limit;
    
    // Check cache first
    const cacheKey = `products:${JSON.stringify(req.query)}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    const where = { isActive: true };
    if (category) where.category = category;
    if (search) where.name = { [Op.iLike]: `%${search}%` };
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = minPrice;
      if (maxPrice) where.price[Op.lte] = maxPrice;
    }
    
    const { rows: products, count } = await Product.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });
    
    const result = {
      success: true,
      data: { products, total: count, page: parseInt(page), limit: parseInt(limit) }
    };
    
    // Cache for 5 minutes
    await redisClient.setEx(cacheKey, 300, JSON.stringify(result));
    
    res.json(result);
  } catch (error) {
    logger.error('Get products failed:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check cache
    const cached = await redisClient.get(`product:${id}`);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    const product = await Product.findByPk(id);
    if (!product || !product.isActive) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const result = { success: true, data: { product } };
    await redisClient.setEx(`product:${id}`, 300, JSON.stringify(result));
    
    res.json(result);
  } catch (error) {
    logger.error('Get product failed:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

app.post('/products', async (req, res) => {
  try {
    const product = await Product.create(req.body);
    
    // Publish product created event
    await eventBus.publish('product.events', 'product.created', {
      productId: product.id,
      name: product.name,
      price: product.price,
      inventory: product.inventory
    });
    
    // Invalidate cache
    await redisClient.del('products:*');
    
    res.status(201).json({ success: true, data: { product } });
  } catch (error) {
    logger.error('Create product failed:', error);
    res.status(400).json({ error: error.message });
  }
});

app.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await Product.update(req.body, { where: { id } });
    
    if (!updated) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const product = await Product.findByPk(id);
    
    // Publish product updated event
    await eventBus.publish('product.events', 'product.updated', {
      productId: product.id,
      changes: req.body
    });
    
    // Invalidate cache
    await redisClient.del(`product:${id}`);
    await redisClient.del('products:*');
    
    res.json({ success: true, data: { product } });
  } catch (error) {
    logger.error('Update product failed:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/products/:id/reserve', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    
    const product = await Product.findByPk(id);
    if (!product || product.inventory < quantity) {
      return res.status(400).json({ error: 'Insufficient inventory' });
    }
    
    await product.update({ inventory: product.inventory - quantity });
    
    await eventBus.publish('product.events', 'inventory.reserved', {
      productId: id,
      quantity,
      remainingInventory: product.inventory - quantity
    });
    
    res.json({ success: true, message: 'Inventory reserved' });
  } catch (error) {
    logger.error('Reserve inventory failed:', error);
    res.status(500).json({ error: 'Failed to reserve inventory' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'product-service', timestamp: new Date().toISOString() });
});

// Start service
const startService = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    await redisClient.connect();
    await eventBus.connect();
    
    app.listen(PORT, async () => {
      logger.info(`Product Service running on port ${PORT}`);
      
      await serviceRegistry.register(
        'product',
        `product-${process.pid}`,
        'localhost',
        PORT,
        '/health'
      );
    });
  } catch (error) {
    logger.error('Product service startup failed:', error);
    process.exit(1);
  }
};

startService();

process.on('SIGTERM', async () => {
  await serviceRegistry.deregister(`product-${process.pid}`);
  await eventBus.close();
  process.exit(0);
});