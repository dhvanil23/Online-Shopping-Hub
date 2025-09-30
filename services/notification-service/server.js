const express = require('express');
const nodemailer = require('nodemailer');
const { Server } = require('socket.io');
const http = require('http');
const eventBus = require('../../shared/events/eventBus');
const serviceRegistry = require('../../shared/utils/serviceRegistry');
const logger = require('../../shared/utils/logger');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const PORT = process.env.NOTIFICATION_PORT || 3005;

// Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

app.use(express.json());

// Connected users for real-time notifications
const connectedUsers = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);
  
  socket.on('authenticate', (data) => {
    const { userId } = data;
    connectedUsers.set(userId, socket.id);
    socket.userId = userId;
    logger.info(`User authenticated: ${userId}`);
  });
  
  socket.on('disconnect', () => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      logger.info(`User disconnected: ${socket.userId}`);
    }
  });
});

// Notification functions
const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      html
    });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    logger.error('Email sending failed:', error);
  }
};

const sendRealTimeNotification = (userId, notification) => {
  const socketId = connectedUsers.get(userId);
  if (socketId) {
    io.to(socketId).emit('notification', notification);
    logger.info(`Real-time notification sent to user ${userId}`);
  }
};

// Event handlers
eventBus.subscribe('user.events', 'user.created', async (data) => {
  const { userId, email } = data;
  
  await sendEmail(
    email,
    'Welcome to Our E-Commerce Platform!',
    `
    <h2>Welcome!</h2>
    <p>Thank you for joining our platform. Your account has been created successfully.</p>
    <p>Start exploring our products and enjoy shopping!</p>
    `
  );
  
  sendRealTimeNotification(userId, {
    type: 'welcome',
    title: 'Welcome!',
    message: 'Your account has been created successfully',
    timestamp: new Date().toISOString()
  });
});

eventBus.subscribe('order.events', 'order.created', async (data) => {
  const { orderId, userId, totalAmount } = data;
  
  sendRealTimeNotification(userId, {
    type: 'order_created',
    title: 'Order Created',
    message: `Your order #${orderId} for $${totalAmount} has been created`,
    orderId,
    timestamp: new Date().toISOString()
  });
});

eventBus.subscribe('order.events', 'order.status.updated', async (data) => {
  const { orderId, status, userId } = data;
  
  const statusMessages = {
    confirmed: 'Your order has been confirmed and is being processed',
    processing: 'Your order is being prepared for shipment',
    shipped: 'Your order has been shipped and is on its way',
    delivered: 'Your order has been delivered successfully'
  };
  
  if (statusMessages[status]) {
    sendRealTimeNotification(userId, {
      type: 'order_status',
      title: 'Order Update',
      message: statusMessages[status],
      orderId,
      status,
      timestamp: new Date().toISOString()
    });
  }
});

eventBus.subscribe('payment.events', 'payment.completed', async (data) => {
  const { orderId, amount, userId } = data;
  
  sendRealTimeNotification(userId, {
    type: 'payment_success',
    title: 'Payment Successful',
    message: `Payment of $${amount} for order #${orderId} completed successfully`,
    orderId,
    timestamp: new Date().toISOString()
  });
});

eventBus.subscribe('payment.events', 'payment.failed', async (data) => {
  const { orderId, userId, error } = data;
  
  sendRealTimeNotification(userId, {
    type: 'payment_failed',
    title: 'Payment Failed',
    message: `Payment for order #${orderId} failed. Please try again.`,
    orderId,
    error: error?.message,
    timestamp: new Date().toISOString()
  });
});

eventBus.subscribe('product.events', 'inventory.low', async (data) => {
  const { productId, productName, inventory } = data;
  
  // Notify admins about low inventory
  io.emit('admin_notification', {
    type: 'low_inventory',
    title: 'Low Inventory Alert',
    message: `Product "${productName}" has low inventory: ${inventory} units remaining`,
    productId,
    timestamp: new Date().toISOString()
  });
});

// REST endpoints for notifications
app.post('/send-email', async (req, res) => {
  try {
    const { to, subject, html } = req.body;
    await sendEmail(to, subject, html);
    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    logger.error('Send email failed:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

app.post('/send-notification', (req, res) => {
  try {
    const { userId, notification } = req.body;
    sendRealTimeNotification(userId, notification);
    res.json({ success: true, message: 'Notification sent successfully' });
  } catch (error) {
    logger.error('Send notification failed:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

app.get('/connected-users', (req, res) => {
  res.json({
    success: true,
    data: {
      count: connectedUsers.size,
      users: Array.from(connectedUsers.keys())
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'notification-service', 
    timestamp: new Date().toISOString(),
    connectedUsers: connectedUsers.size
  });
});

// Start service
const startService = async () => {
  try {
    await eventBus.connect();
    
    server.listen(PORT, async () => {
      logger.info(`Notification Service running on port ${PORT}`);
      
      await serviceRegistry.register(
        'notification',
        `notification-${process.pid}`,
        'localhost',
        PORT,
        '/health'
      );
    });
  } catch (error) {
    logger.error('Notification service startup failed:', error);
    process.exit(1);
  }
};

startService();

process.on('SIGTERM', async () => {
  await serviceRegistry.deregister(`notification-${process.pid}`);
  await eventBus.close();
  process.exit(0);
});