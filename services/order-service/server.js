const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const axios = require('axios');
const eventBus = require('../../shared/events/eventBus');
const serviceRegistry = require('../../shared/utils/serviceRegistry');
const logger = require('../../shared/utils/logger');
const CircuitBreaker = require('../../shared/middleware/circuitBreaker');

const app = express();
const PORT = process.env.ORDER_PORT || 3003;

// Database setup
const sequelize = new Sequelize(process.env.ORDER_DB_URL || 'postgres://postgres:password@localhost:5432/order_db', {
  logging: false
});

// Order models
const Order = sequelize.define('Order', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  status: { 
    type: DataTypes.ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'),
    defaultValue: 'pending'
  },
  totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  shippingAddress: { type: DataTypes.JSONB },
  paymentIntentId: { type: DataTypes.STRING }
});

const OrderItem = sequelize.define('OrderItem', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orderId: { type: DataTypes.UUID, allowNull: false },
  productId: { type: DataTypes.UUID, allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  unitPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  totalPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false }
});

Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

// Circuit breakers for external services
const productServiceBreaker = new CircuitBreaker();
const paymentServiceBreaker = new CircuitBreaker();

app.use(express.json());

// Helper function to call external services
const callService = async (serviceName, path, method = 'GET', data = null) => {
  const service = await serviceRegistry.getHealthyService(serviceName);
  const url = `http://${service.address}:${service.port}${path}`;
  
  const config = { method, url };
  if (data) config.data = data;
  
  const response = await axios(config);
  return response.data;
};

// Order endpoints
app.post('/orders', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { userId, items, shippingAddress } = req.body;
    
    let totalAmount = 0;
    const orderItems = [];
    
    // Validate products and calculate total
    for (const item of items) {
      const productData = await productServiceBreaker.execute(async () => {
        return await callService('product', `/products/${item.productId}`);
      });
      
      const product = productData.data.product;
      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;
      
      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.price,
        totalPrice: itemTotal
      });
    }
    
    // Create order
    const order = await Order.create({
      userId,
      totalAmount,
      shippingAddress
    }, { transaction });
    
    // Create order items
    for (const item of orderItems) {
      await OrderItem.create({
        ...item,
        orderId: order.id
      }, { transaction });
    }
    
    // Reserve inventory
    for (const item of items) {
      await productServiceBreaker.execute(async () => {
        return await callService('product', `/products/${item.productId}/reserve`, 'POST', {
          quantity: item.quantity
        });
      });
    }
    
    // Create payment intent
    const paymentData = await paymentServiceBreaker.execute(async () => {
      return await callService('payment', '/create-intent', 'POST', {
        amount: totalAmount,
        orderId: order.id
      });
    });
    
    await order.update({ paymentIntentId: paymentData.data.paymentIntentId }, { transaction });
    
    await transaction.commit();
    
    // Publish order created event
    await eventBus.publish('order.events', 'order.created', {
      orderId: order.id,
      userId,
      totalAmount,
      items: orderItems
    });
    
    res.status(201).json({
      success: true,
      data: {
        order,
        clientSecret: paymentData.data.clientSecret
      }
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Create order failed:', error);
    res.status(400).json({ error: error.message });
  }
});

app.get('/orders', async (req, res) => {
  try {
    const { userId, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    if (userId) where.userId = userId;
    
    const { rows: orders, count } = await Order.findAndCountAll({
      where,
      include: [{ model: OrderItem, as: 'items' }],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: { orders, total: count, page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (error) {
    logger.error('Get orders failed:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.get('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await Order.findByPk(id, {
      include: [{ model: OrderItem, as: 'items' }]
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({ success: true, data: { order } });
  } catch (error) {
    logger.error('Get order failed:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

app.put('/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    await order.update({ status });
    
    // Publish order status updated event
    await eventBus.publish('order.events', 'order.status.updated', {
      orderId: id,
      status,
      previousStatus: order.status
    });
    
    res.json({ success: true, data: { order } });
  } catch (error) {
    logger.error('Update order status failed:', error);
    res.status(400).json({ error: error.message });
  }
});

// Event handlers
eventBus.subscribe('payment.events', 'payment.completed', async (data) => {
  try {
    const order = await Order.findOne({ where: { paymentIntentId: data.paymentIntentId } });
    if (order) {
      await order.update({ status: 'confirmed' });
      logger.info(`Order ${order.id} confirmed after payment`);
    }
  } catch (error) {
    logger.error('Payment completion handler failed:', error);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'order-service', timestamp: new Date().toISOString() });
});

// Start service
const startService = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    await eventBus.connect();
    
    app.listen(PORT, async () => {
      logger.info(`Order Service running on port ${PORT}`);
      
      await serviceRegistry.register(
        'order',
        `order-${process.pid}`,
        'localhost',
        PORT,
        '/health'
      );
    });
  } catch (error) {
    logger.error('Order service startup failed:', error);
    process.exit(1);
  }
};

startService();

process.on('SIGTERM', async () => {
  await serviceRegistry.deregister(`order-${process.pid}`);
  await eventBus.close();
  process.exit(0);
});