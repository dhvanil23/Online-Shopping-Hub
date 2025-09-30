const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const serviceRegistry = require('../../shared/utils/serviceRegistry');
const logger = require('../../shared/utils/logger');
const CircuitBreaker = require('../../shared/middleware/circuitBreaker');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP'
});
app.use(limiter);

// Circuit breakers for each service
const circuitBreakers = {
  auth: new CircuitBreaker({ failureThreshold: 3, resetTimeout: 30000 }),
  product: new CircuitBreaker({ failureThreshold: 3, resetTimeout: 30000 }),
  order: new CircuitBreaker({ failureThreshold: 3, resetTimeout: 30000 }),
  payment: new CircuitBreaker({ failureThreshold: 3, resetTimeout: 30000 })
};

// Dynamic proxy with service discovery
const createDynamicProxy = (serviceName) => {
  return createProxyMiddleware({
    target: 'http://localhost:3001', // fallback
    changeOrigin: true,
    router: async (req) => {
      try {
        const service = await circuitBreakers[serviceName].execute(async () => {
          return await serviceRegistry.getHealthyService(serviceName);
        });
        return `http://${service.address}:${service.port}`;
      } catch (error) {
        logger.error(`Service discovery failed for ${serviceName}:`, error);
        // Fallback to default ports
        const fallbackPorts = { auth: 3001, product: 3002, order: 3003, payment: 3004 };
        return `http://localhost:${fallbackPorts[serviceName]}`;
      }
    },
    onError: (err, req, res) => {
      logger.error('Proxy error:', err);
      res.status(503).json({ error: 'Service temporarily unavailable' });
    }
  });
};

// Route to services
app.use('/api/auth', createDynamicProxy('auth'));
app.use('/api/products', createDynamicProxy('product'));
app.use('/api/orders', createDynamicProxy('order'));
app.use('/api/payments', createDynamicProxy('payment'));

// Health check
app.get('/health', (req, res) => {
  const circuitStates = Object.entries(circuitBreakers).reduce((acc, [service, cb]) => {
    acc[service] = cb.getState();
    return acc;
  }, {});

  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'api-gateway',
    circuitBreakers: circuitStates
  });
});

// Service status endpoint
app.get('/api/status', async (req, res) => {
  const services = ['auth', 'product', 'order', 'payment'];
  const status = {};

  for (const service of services) {
    try {
      const instances = await serviceRegistry.discover(service);
      status[service] = {
        healthy: instances.length,
        instances: instances.map(i => `${i.address}:${i.port}`)
      };
    } catch (error) {
      status[service] = { healthy: 0, error: error.message };
    }
  }

  res.json({ services: status });
});

// Start server
app.listen(PORT, async () => {
  logger.info(`API Gateway running on port ${PORT}`);
  
  // Register with service registry
  await serviceRegistry.register(
    'api-gateway',
    `api-gateway-${process.pid}`,
    'localhost',
    PORT,
    '/health'
  );
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('API Gateway shutting down...');
  await serviceRegistry.deregister(`api-gateway-${process.pid}`);
  process.exit(0);
});