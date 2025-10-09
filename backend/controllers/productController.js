const Product = require('../models/Product');
const Review = require('../models/Review');
const redis = require('../config/redis');

class ProductController {
  static async getProducts(req, res) {
    try {
      const { cursor, limit, search, category, sortBy, sortOrder } = req.query;
      const cacheKey = `products:${JSON.stringify(req.query)}`;
      
      // Try cache first (only for first load without cursor)
      if (!cursor && redis.isConnected()) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }
      }
      
      const result = await Product.findAll({
        cursor,
        limit,
        search,
        category,
        sortBy,
        sortOrder
      });

      const response = {
        success: true,
        data: result,
        message: 'Products retrieved successfully'
      };

      // Cache result (only for first load)
      if (!cursor && redis.isConnected()) {
        await redis.set(cacheKey, response, 300);
      }

      res.json(response);
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
      
      const [product, reviews, stats] = await Promise.all([
        Product.findById(id),
        Review.findByProduct(id),
        Review.getProductStats(id)
      ]);
      
      if (!product) {
        return res.status(404).json({ 
          success: false, 
          error: 'Product not found' 
        });
      }

      res.json({ 
        success: true, 
        data: {
          ...product,
          reviews,
          reviewStats: {
            totalReviews: parseInt(stats.totalReviews),
            averageRating: parseFloat(stats.averageRating) || 0,
            distribution: {
              5: parseInt(stats.fiveStars),
              4: parseInt(stats.fourStars),
              3: parseInt(stats.threeStars),
              2: parseInt(stats.twoStars),
              1: parseInt(stats.oneStar)
            }
          }
        },
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

      // Invalidate product cache
      if (redis.isConnected()) {
        const keys = await redis.getClient().keys('products:*');
        if (keys.length > 0) {
          await redis.getClient().del(keys);
        }
      }

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

      // Invalidate product cache
      if (redis.isConnected()) {
        const keys = await redis.getClient().keys('products:*');
        if (keys.length > 0) {
          await redis.getClient().del(keys);
        }
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
      if (req.user.role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          error: 'Admin access required' 
        });
      }

      const { id } = req.params;

      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ 
          success: false, 
          error: 'Product not found' 
        });
      }

      await Product.delete(id);

      // Invalidate product cache
      if (redis.isConnected()) {
        const keys = await redis.getClient().keys('products:*');
        if (keys.length > 0) {
          await redis.getClient().del(keys);
        }
      }

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