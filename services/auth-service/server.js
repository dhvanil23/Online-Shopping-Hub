const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Sequelize, DataTypes } = require('sequelize');
const redis = require('redis');
const eventBus = require('../../shared/events/eventBus');
const serviceRegistry = require('../../shared/utils/serviceRegistry');
const logger = require('../../shared/utils/logger');

const app = express();
const PORT = process.env.AUTH_PORT || 3001;

// Database setup
const sequelize = new Sequelize(process.env.AUTH_DB_URL || 'postgres://postgres:password@localhost:5432/auth_db', {
  logging: false
});

// User model
const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('customer', 'admin', 'vendor'), defaultValue: 'customer' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});

// Redis client
const redisClient = redis.createClient({ url: process.env.REDIS_URL });

app.use(express.json());

// Auth endpoints
app.post('/register', async (req, res) => {
  try {
    const { email, password, role = 'customer' } = req.body;
    
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ email, password: hashedPassword, role });
    
    // Publish user created event
    await eventBus.publish('user.events', 'user.created', {
      userId: user.id,
      email: user.email,
      role: user.role
    });
    
    res.status(201).json({ 
      success: true, 
      data: { id: user.id, email: user.email, role: user.role } 
    });
  } catch (error) {
    logger.error('Registration failed:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ where: { email, isActive: true } });
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );
    
    // Cache user session
    await redisClient.setEx(`session:${user.id}`, 86400, JSON.stringify({
      id: user.id, email: user.email, role: user.role
    }));
    
    // Publish login event
    await eventBus.publish('user.events', 'user.login', {
      userId: user.id,
      timestamp: new Date().toISOString()
    });
    
    res.json({ success: true, data: { token, user: { id: user.id, email: user.email, role: user.role } } });
  } catch (error) {
    logger.error('Login failed:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    
    // Check cached session
    const session = await redisClient.get(`session:${decoded.id}`);
    if (!session) {
      return res.status(401).json({ error: 'Session expired' });
    }
    
    res.json({ success: true, data: JSON.parse(session) });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.post('/logout', async (req, res) => {
  try {
    const { token } = req.body;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    
    await redisClient.del(`session:${decoded.id}`);
    
    await eventBus.publish('user.events', 'user.logout', {
      userId: decoded.id,
      timestamp: new Date().toISOString()
    });
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Logout failed' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'auth-service', timestamp: new Date().toISOString() });
});

// Start service
const startService = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    await redisClient.connect();
    await eventBus.connect();
    
    app.listen(PORT, async () => {
      logger.info(`Auth Service running on port ${PORT}`);
      
      await serviceRegistry.register(
        'auth',
        `auth-${process.pid}`,
        'localhost',
        PORT,
        '/health'
      );
    });
  } catch (error) {
    logger.error('Auth service startup failed:', error);
    process.exit(1);
  }
};

startService();

process.on('SIGTERM', async () => {
  await serviceRegistry.deregister(`auth-${process.pid}`);
  await eventBus.close();
  process.exit(0);
});