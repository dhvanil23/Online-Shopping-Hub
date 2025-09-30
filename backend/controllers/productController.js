const Product = require('../models/Product');
const { validationResult } = require('express-validator');

class ProductController {
  static async getProducts(req, res) {
    try {
      const { page, limit, search, category, sortBy, sortOrder } = req.query;
      
      const result = await Product.findAll({
        page,
        limit,
        search,
        category,
        sortBy,
        sortOrder
      });

      res.json({
        success: true,
        data: result,
        message: 'Products retrieved successfully'
      });
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch products' 
      });
    }
  }

  static async getProduct(req, res) {
    try {
      const { id } = req.params;
      
      const product = await Product.findById(id);
      
      if (!product) {
        return res.status(404).json({ 
          success: false, 
          error: 'Product not found' 
        });
      }

      res.json({ 
        success: true, 
        data: product,
        message: 'Product retrieved successfully'
      });
    } catch (error) {
      console.error('Get product error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch product' 
      });
    }
  }

  static async createProduct(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      // Check admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          error: 'Admin access required' 
        });
      }

      const { name, description, price, category, inventory, image } = req.body;

      const product = await Product.create({
        name,
        description,
        price,
        category,
        inventory,
        image
      });

      res.status(201).json({ 
        success: true, 
        data: product,
        message: 'Product created successfully'
      });
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create product' 
      });
    }
  }

  static async updateProduct(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      // Check admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          error: 'Admin access required' 
        });
      }

      const { id } = req.params;
      const { name, description, price, category, inventory, image } = req.body;

      const product = await Product.update(id, {
        name,
        description,
        price,
        category,
        inventory,
        image
      });

      if (!product) {
        return res.status(404).json({ 
          success: false, 
          error: 'Product not found' 
        });
      }

      res.json({ 
        success: true, 
        data: product,
        message: 'Product updated successfully'
      });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update product' 
      });
    }
  }

  static async deleteProduct(req, res) {
    try {
      // Check admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          error: 'Admin access required' 
        });
      }

      const { id } = req.params;

      // Check if product exists
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ 
          success: false, 
          error: 'Product not found' 
        });
      }

      await Product.delete(id);

      res.json({ 
        success: true, 
        message: 'Product deleted successfully' 
      });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to delete product' 
      });
    }
  }

  static async getFeaturedProducts(req, res) {
    try {
      const result = await Product.findAll({ limit: 6, sortBy: 'createdAt', sortOrder: 'desc' });

      res.json({
        success: true,
        data: result.products,
        message: 'Featured products retrieved successfully'
      });
    } catch (error) {
      console.error('Get featured products error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch featured products' 
      });
    }
  }
}

module.exports = ProductController;