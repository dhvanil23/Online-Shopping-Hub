const jwt = require('jsonwebtoken');
const User = require('../models/User');
const redis = require('../config/redis');

class AuthController {
  static async register(req, res) {
    try {
      const { email, password, name, role = 'customer' } = req.body;

      // Check if user already exists
      const existingUser = await User.emailExists(email);
      if (existingUser) {
        return res.status(409).json({ 
          success: false, 
          error: 'Email already registered' 
        });
      }

      const user = await User.create({ email, password, name, role });
      
      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role }, 
        process.env.JWT_SECRET || 'secret', 
        { expiresIn: '24h' }
      );

      res.status(201).json({
        success: true,
        data: { user, token },
        message: 'User registered successfully'
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Registration failed' 
      });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid credentials' 
        });
      }

      const isValidPassword = await User.validatePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid credentials' 
        });
      }

      await User.updateLastLogin(user.id);

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role }, 
        process.env.JWT_SECRET || 'secret', 
        { expiresIn: '24h' }
      );

      const { password: _, ...userWithoutPassword } = user;

      // Store session in Redis
      req.session.userId = user.id;
      req.session.userRole = user.role;
      
      // Cache user data (if Redis is available)
      if (redis.isConnected()) {
        await redis.set(`user:${user.id}`, userWithoutPassword, 3600);
      }

      res.json({
        success: true,
        data: { 
          user: userWithoutPassword, 
          token 
        },
        message: 'Login successful'
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Login failed' 
      });
    }
  }

  static async getProfile(req, res) {
    try {
      // Try to get from cache first (if Redis is available)
      if (redis.isConnected()) {
        const cachedUser = await redis.get(`user:${req.user.id}`);
        if (cachedUser) {
          return res.json({ 
            success: true, 
            data: JSON.parse(cachedUser) 
          });
        }
      }

      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: 'User not found' 
        });
      }

      // Cache the user data (if Redis is available)
      if (redis.isConnected()) {
        await redis.set(`user:${user.id}`, user, 3600);
      }

      res.json({ 
        success: true, 
        data: user 
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get profile' 
      });
    }
  }

  static async logout(req, res) {
    try {
      // Clear user cache (if Redis is available)
      if (req.user?.id && redis.isConnected()) {
        await redis.del(`user:${req.user.id}`);
      }
      
      // Destroy session (if session middleware is available)
      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            console.error('Session destroy error:', err);
          }
        });
      }

      res.json({ 
        success: true, 
        message: 'Logged out successfully' 
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Logout failed' 
      });
    }
  }
}

module.exports = AuthController;