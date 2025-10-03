const jwt = require('jsonwebtoken');
const User = require('../models/User');

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
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: 'User not found' 
        });
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
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  }
}

module.exports = AuthController;