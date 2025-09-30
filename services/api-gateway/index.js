const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const logger = require('../../shared/utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Security and performance middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

app.use(compression());

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001', 'http://localhost:3003'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    error: 'Too many authentication attempts, please try again later'
  }
});

app.use('/api/v1/auth', authLimiter);

app.use(express.json({ limit: '10mb' }));

// Service discovery configuration
const services = {
  auth: {
    target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    changeOrigin: true,
    timeout: 30000,
    retries: 3
  },
  product: {
    target: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
    changeOrigin: true,
    timeout: 30000,
    retries: 3
  },
  order: {
    target: process.env.ORDER_SERVICE_URL || 'http://localhost:3003',
    changeOrigin: true,
    timeout: 30000,
    retries: 3
  },
  payment: {
    target: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004',
    changeOrigin: true,
    timeout: 30000,
    retries: 3
  },
  notification: {
    target: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005',
    changeOrigin: true,
    timeout: 30000,
    retries: 3
  }
};

// Circuit breaker implementation
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  canExecute() {
    if (this.state === 'CLOSED') {
      return true;
    }
    
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    
    return true; // HALF_OPEN
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}

const circuitBreakers = {
  auth: new CircuitBreaker(),
  product: new CircuitBreaker(),
  order: new CircuitBreaker(),
  payment: new CircuitBreaker(),
  notification: new CircuitBreaker()
};

// Custom proxy middleware with circuit breaker
const createServiceProxy = (serviceName) => {
  const service = services[serviceName];
  const circuitBreaker = circuitBreakers[serviceName];

  return createProxyMiddleware({
    target: service.target,
    changeOrigin: service.changeOrigin,
    timeout: service.timeout,
    retries: service.retries,
    onError: (err, req, res) => {
      circuitBreaker.onFailure();
      logger.error(`${serviceName} service error:`, err.message);
      
      if (circuitBreaker.state === 'OPEN') {
        return res.status(503).json({
          error: `${serviceName} service is temporarily unavailable`,
          code: 'SERVICE_UNAVAILABLE'
        });
      }
      
      res.status(502).json({
        error: `${serviceName} service error`,
        code: 'BAD_GATEWAY'
      });
    },
    onProxyRes: (proxyRes, req, res) => {
      if (proxyRes.statusCode < 500) {
        circuitBreaker.onSuccess();
      } else {
        circuitBreaker.onFailure();
      }
    },
    onProxyReq: (proxyReq, req, res) => {
      if (!circuitBreaker.canExecute()) {
        res.status(503).json({
          error: `${serviceName} service is temporarily unavailable`,
          code: 'CIRCUIT_BREAKER_OPEN'
        });
        return;
      }
    }
  });
};

// API Routes with circuit breakers
app.use('/api/v1/auth', createServiceProxy('auth'));
app.use('/api/v1/products', createServiceProxy('product'));
app.use('/api/v1/orders', createServiceProxy('order'));
app.use('/api/v1/payments', createServiceProxy('payment'));
app.use('/api/v1/notifications', createServiceProxy('notification'));

// Legacy routes for backward compatibility
app.use('/api/auth', createServiceProxy('auth'));
app.use('/api/products', createServiceProxy('product'));
app.use('/api/orders', createServiceProxy('order'));

// Health check endpoint
app.get('/health', async (req, res) => {
  const healthStatus = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {}
  };

  // Check service health
  for (const [serviceName, circuitBreaker] of Object.entries(circuitBreakers)) {
    healthStatus.services[serviceName] = {
      status: circuitBreaker.state,
      failureCount: circuitBreaker.failureCount,
      lastFailureTime: circuitBreaker.lastFailureTime
    };
  }

  const overallHealthy = Object.values(circuitBreakers).every(cb => cb.state !== 'OPEN');
  
  res.status(overallHealthy ? 200 : 503).json(healthStatus);
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    circuitBreakers: {}
  };

  for (const [serviceName, circuitBreaker] of Object.entries(circuitBreakers)) {
    metrics.circuitBreakers[serviceName] = {
      state: circuitBreaker.state,
      failureCount: circuitBreaker.failureCount,
      lastFailureTime: circuitBreaker.lastFailureTime
    };
  }

  res.json(metrics);
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('API Gateway error:', err);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info('Service endpoints configured:');
  Object.entries(services).forEach(([name, config]) => {
    logger.info(`  ${name}: ${config.target}`);
  });
});