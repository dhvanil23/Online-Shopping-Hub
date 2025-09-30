const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.AUTH_PORT || 3001;

// In-memory storage for demo
const users = new Map();
const sessions = new Map();

app.use(express.json());

// Auth endpoints
app.post('/register', async (req, res) => {
  try {
    const { email, password, role = 'customer' } = req.body;
    
    if (users.has(email)) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = {
      id: Date.now().toString(),
      email,
      password: hashedPassword,
      role,
      isActive: true
    };
    
    users.set(email, user);
    
    res.status(201).json({ 
      success: true, 
      data: { id: user.id, email: user.email, role: user.role } 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = users.get(email);
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      'demo-secret',
      { expiresIn: '24h' }
    );
    
    sessions.set(user.id, { id: user.id, email: user.email, role: user.role });
    
    res.json({ 
      success: true, 
      data: { 
        token, 
        user: { id: user.id, email: user.email, role: user.role } 
      } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/verify', (req, res) => {
  try {
    const { token } = req.body;
    const decoded = jwt.verify(token, 'demo-secret');
    
    const session = sessions.get(decoded.id);
    if (!session) {
      return res.status(401).json({ error: 'Session expired' });
    }
    
    res.json({ success: true, data: session });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'auth-service', 
    timestamp: new Date().toISOString(),
    users: users.size
  });
});

app.listen(PORT, () => {
  console.log(`✅ Auth Service running on port ${PORT}`);
});