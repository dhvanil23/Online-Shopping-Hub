const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP'
});
app.use(limiter);

// Simple proxy without service discovery
const createSimpleProxy = (target) => {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    onError: (err, req, res) => {
      console.error(`Proxy error to ${target}:`, err.message);
      res.status(503).json({ error: 'Service temporarily unavailable' });
    }
  });
};

// Route to services
app.use('/api/auth', createSimpleProxy('http://localhost:3001'));
app.use('/api/products', createSimpleProxy('http://localhost:3002'));
app.use('/api/orders', createSimpleProxy('http://localhost:3003'));
app.use('/api/payments', createSimpleProxy('http://localhost:3004'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'api-gateway'
  });
});

// Service status endpoint
app.get('/api/status', async (req, res) => {
  const services = [
    { name: 'auth', port: 3001 },
    { name: 'product', port: 3002 },
    { name: 'order', port: 3003 },
    { name: 'payment', port: 3004 }
  ];
  
  const status = {};
  
  for (const service of services) {
    try {
      const response = await fetch(`http://localhost:${service.port}/health`);
      status[service.name] = response.ok ? 'healthy' : 'unhealthy';
    } catch (error) {
      status[service.name] = 'down';
    }
  }
  
  res.json({ services: status });
});

// Demo frontend
app.get('/', (req, res) => {
  res.send(`
    <h1>🚀 E-Commerce Microservices Platform</h1>
    <h2>Services Status:</h2>
    <ul>
      <li><a href="/health">API Gateway Health</a></li>
      <li><a href="/api/status">All Services Status</a></li>
      <li><a href="http://localhost:3001/health">Auth Service</a></li>
      <li><a href="http://localhost:3002/health">Product Service</a></li>
    </ul>
    <h2>Test APIs:</h2>
    <pre>
# Register User
curl -X POST http://localhost:3000/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"email": "test@example.com", "password": "password123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "test@example.com", "password": "password123"}'

# Get Products
curl http://localhost:3000/api/products
    </pre>
  `);
});

app.listen(PORT, () => {
  console.log(`🌐 API Gateway running on port ${PORT}`);
  console.log(`📱 Demo: http://localhost:${PORT}`);
});