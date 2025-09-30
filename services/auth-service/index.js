const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Sequelize, DataTypes } = require('sequelize');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('../../shared/utils/logger');
const { createSequelizeInstance } = require('../../config/database');
const { createRedisClient } = require('../../config/redis');

const app = express();
const PORT = process.env.AUTH_PORT || 3001;

// Security middleware
app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
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

// User model
const User = sequelize.define('User', {
  id: { 
    type: DataTypes.UUID, 
    defaultValue: DataTypes.UUIDV4, 
    primaryKey: true 
  },
  email: { 
    type: DataTypes.STRING, 
    unique: true, 
    allowNull: false,
    validate: { isEmail: true }
  },
  password: { 
    type: DataTypes.STRING, 
    allowNull: false,
    validate: { len: [6, 100] }
  },
  name: { 
    type: DataTypes.STRING, 
    allowNull: false,
    validate: { len: [2, 50] }
  },
  role: { 
    type: DataTypes.ENUM('customer', 'admin', 'vendor'), 
    defaultValue: 'customer' 
  },
  isActive: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: true 
  },
  emailVerified: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: false 
  },
  lastLogin: { 
    type: DataTypes.DATE 
  }
}, {
  indexes: [
    { fields: ['email'] },
    { fields: ['role'] },
    { fields: ['isActive'] }
  ]
});

app.use(express.json({ limit: '10mb' }));

// Auth middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    
    // Check if token is blacklisted
    const blacklisted = await redisClient.get(`blacklist:${token}`);
    if (blacklisted) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Routes
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { email, password, name, role = 'customer' } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      role
    });

    // Generate tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      { expiresIn: '7d' }
    );

    // Store refresh token
    await redisClient.setEx(`refresh:${user.id}`, 7 * 24 * 60 * 60, refreshToken);

    logger.info(`User registered: ${email}`);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Registration failed:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ 
      where: { email, isActive: true } 
    });

    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    // Generate tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      { expiresIn: '7d' }
    );

    // Store refresh token and user session (if Redis available)
    if (redisClient) {
      try {
        await Promise.all([
          redisClient.setEx(`refresh:${user.id}`, 7 * 24 * 60 * 60, refreshToken),
          redisClient.setEx(`session:${user.id}`, 15 * 60, JSON.stringify({
            id: user.id,
            email: user.email,
            role: user.role
          }))
        ]);
      } catch (error) {
        console.warn('Redis operation failed:', error.message);
      }
    }

    logger.info(`User logged in: ${email}`);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Login failed:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/v1/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh-secret');
    
    // Check if refresh token exists in Redis
    const storedToken = await redisClient.get(`refresh:${decoded.id}`);
    if (storedToken !== refreshToken) {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }

    // Get user
    const user = await User.findByPk(decoded.id);
    if (!user || !user.isActive) {
      return res.status(403).json({ error: 'User not found or inactive' });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '15m' }
    );

    res.json({
      success: true,
      data: { accessToken }
    });
  } catch (error) {
    logger.error('Token refresh failed:', error);
    res.status(403).json({ error: 'Invalid refresh token' });
  }
});

app.post('/api/v1/auth/logout', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const token = req.headers['authorization'].split(' ')[1];

    // Blacklist access token
    const decoded = jwt.decode(token);
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
    
    await Promise.all([
      redisClient.setEx(`blacklist:${token}`, expiresIn, 'true'),
      redisClient.del(`refresh:${req.user.id}`),
      redisClient.del(`session:${req.user.id}`)
    ]);

    logger.info(`User logged out: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout failed:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

app.get('/api/v1/auth/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'email', 'name', 'role', 'emailVerified', 'lastLogin', 'createdAt']
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Get profile failed:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await sequelize.close();
  await redisClient.quit();
  process.exit(0);
});

// Start service
const startService = async () => {
  try {
    // Test database connection
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
    
    // Create demo users if they don't exist
    const demoUsers = [
      {
        email: 'customer@demo.com',
        password: 'password123',
        name: 'Demo Customer',
        role: 'customer'
      },
      {
        email: 'admin@demo.com',
        password: 'password123',
        name: 'Demo Admin',
        role: 'admin'
      }
    ];

    for (const userData of demoUsers) {
      const existingUser = await User.findOne({ where: { email: userData.email } });
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(userData.password, 12);
        await User.create({ ...userData, password: hashedPassword });
        logger.info(`Demo user created: ${userData.email}`);
      }
    }

    app.listen(PORT, () => {
      logger.info(`Auth Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Auth service startup failed:', error);
    process.exit(1);
  }
};

startService();