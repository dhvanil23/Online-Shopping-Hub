const express = require('express');

const app = express();
const PORT = process.env.PRODUCT_PORT || 3002;

// In-memory storage for demo
const products = new Map();

app.use(express.json());

// Sample products
products.set('1', {
  id: '1',
  name: 'iPhone 15 Pro',
  description: 'Latest iPhone with A17 Pro chip',
  price: 999.99,
  inventory: 50,
  sku: 'IP15-PRO-001',
  category: 'Electronics',
  isActive: true
});

products.set('2', {
  id: '2',
  name: 'MacBook Air M3',
  description: '13-inch MacBook Air with M3 chip',
  price: 1299.99,
  inventory: 25,
  sku: 'MBA-M3-001',
  category: 'Electronics',
  isActive: true
});

// Product endpoints
app.get('/products', (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  let productList = Array.from(products.values()).filter(p => p.isActive);
  
  if (search) {
    productList = productList.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedProducts = productList.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    data: {
      products: paginatedProducts,
      total: productList.length,
      page: parseInt(page),
      limit: parseInt(limit)
    }
  });
});

app.get('/products/:id', (req, res) => {
  const { id } = req.params;
  const product = products.get(id);
  
  if (!product || !product.isActive) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  res.json({ success: true, data: { product } });
});

app.post('/products', (req, res) => {
  const product = {
    id: Date.now().toString(),
    ...req.body,
    isActive: true
  };
  
  products.set(product.id, product);
  
  res.status(201).json({ success: true, data: { product } });
});

app.post('/products/:id/reserve', (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;
  
  const product = products.get(id);
  if (!product || product.inventory < quantity) {
    return res.status(400).json({ error: 'Insufficient inventory' });
  }
  
  product.inventory -= quantity;
  products.set(id, product);
  
  res.json({ success: true, message: 'Inventory reserved' });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'product-service', 
    timestamp: new Date().toISOString(),
    products: products.size
  });
});

app.listen(PORT, () => {
  console.log(`✅ Product Service running on port ${PORT}`);
});