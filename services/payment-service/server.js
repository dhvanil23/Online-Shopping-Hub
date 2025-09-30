const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_fake');
const { Sequelize, DataTypes } = require('sequelize');
const eventBus = require('../../shared/events/eventBus');
const serviceRegistry = require('../../shared/utils/serviceRegistry');
const logger = require('../../shared/utils/logger');

const app = express();
const PORT = process.env.PAYMENT_PORT || 3004;

// Database setup
const sequelize = new Sequelize(process.env.PAYMENT_DB_URL || 'postgres://postgres:password@localhost:5432/payment_db', {
  logging: false
});

// Payment model
const Payment = sequelize.define('Payment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orderId: { type: DataTypes.UUID, allowNull: false },
  paymentIntentId: { type: DataTypes.STRING, unique: true },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  currency: { type: DataTypes.STRING, defaultValue: 'usd' },
  status: { 
    type: DataTypes.ENUM('pending', 'processing', 'succeeded', 'failed', 'cancelled'),
    defaultValue: 'pending'
  },
  metadata: { type: DataTypes.JSONB }
});

app.use(express.json());

// Payment endpoints
app.post('/create-intent', async (req, res) => {
  try {
    const { amount, orderId, currency = 'usd' } = req.body;
    
    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata: { orderId },
      automatic_payment_methods: { enabled: true }
    });
    
    // Store payment record
    const payment = await Payment.create({
      orderId,
      paymentIntentId: paymentIntent.id,
      amount,
      currency,
      status: 'pending',
      metadata: { orderId }
    });
    
    // Publish payment intent created event
    await eventBus.publish('payment.events', 'payment.intent.created', {
      paymentId: payment.id,
      orderId,
      paymentIntentId: paymentIntent.id,
      amount
    });
    
    res.status(201).json({
      success: true,
      data: {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret
      }
    });
  } catch (error) {
    logger.error('Create payment intent failed:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/confirm', async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    
    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    // Update payment status
    const payment = await Payment.findOne({ where: { paymentIntentId } });
    if (payment) {
      await payment.update({ status: paymentIntent.status });
      
      if (paymentIntent.status === 'succeeded') {
        // Publish payment completed event
        await eventBus.publish('payment.events', 'payment.completed', {
          paymentId: payment.id,
          orderId: payment.orderId,
          paymentIntentId,
          amount: payment.amount
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        status: paymentIntent.status,
        paymentIntent
      }
    });
  } catch (error) {
    logger.error('Confirm payment failed:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/refund', async (req, res) => {
  try {
    const { paymentIntentId, amount } = req.body;
    
    const refundData = { payment_intent: paymentIntentId };
    if (amount) {
      refundData.amount = Math.round(amount * 100);
    }
    
    const refund = await stripe.refunds.create(refundData);
    
    // Update payment status
    const payment = await Payment.findOne({ where: { paymentIntentId } });
    if (payment) {
      await payment.update({ status: 'cancelled' });
      
      // Publish refund event
      await eventBus.publish('payment.events', 'payment.refunded', {
        paymentId: payment.id,
        orderId: payment.orderId,
        refundId: refund.id,
        amount: refund.amount / 100
      });
    }
    
    res.json({
      success: true,
      data: { refund }
    });
  } catch (error) {
    logger.error('Refund failed:', error);
    res.status(400).json({ error: error.message });
  }
});

app.get('/payments', async (req, res) => {
  try {
    const { orderId, status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    if (orderId) where.orderId = orderId;
    if (status) where.status = status;
    
    const { rows: payments, count } = await Payment.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: { payments, total: count, page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (error) {
    logger.error('Get payments failed:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

app.get('/payments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const payment = await Payment.findByPk(id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    res.json({ success: true, data: { payment } });
  } catch (error) {
    logger.error('Get payment failed:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// Stripe webhook handler
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || 'whsec_fake'
    );
    
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        const payment = await Payment.findOne({ 
          where: { paymentIntentId: paymentIntent.id } 
        });
        
        if (payment) {
          await payment.update({ status: 'succeeded' });
          
          await eventBus.publish('payment.events', 'payment.completed', {
            paymentId: payment.id,
            orderId: payment.orderId,
            paymentIntentId: paymentIntent.id,
            amount: payment.amount
          });
        }
        break;
        
      case 'payment_intent.payment_failed':
        const failedIntent = event.data.object;
        const failedPayment = await Payment.findOne({ 
          where: { paymentIntentId: failedIntent.id } 
        });
        
        if (failedPayment) {
          await failedPayment.update({ status: 'failed' });
          
          await eventBus.publish('payment.events', 'payment.failed', {
            paymentId: failedPayment.id,
            orderId: failedPayment.orderId,
            paymentIntentId: failedIntent.id,
            error: failedIntent.last_payment_error
          });
        }
        break;
    }
    
    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'payment-service', timestamp: new Date().toISOString() });
});

// Start service
const startService = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    await eventBus.connect();
    
    app.listen(PORT, async () => {
      logger.info(`Payment Service running on port ${PORT}`);
      
      await serviceRegistry.register(
        'payment',
        `payment-${process.pid}`,
        'localhost',
        PORT,
        '/health'
      );
    });
  } catch (error) {
    logger.error('Payment service startup failed:', error);
    process.exit(1);
  }
};

startService();

process.on('SIGTERM', async () => {
  await serviceRegistry.deregister(`payment-${process.pid}`);
  await eventBus.close();
  process.exit(0);
});