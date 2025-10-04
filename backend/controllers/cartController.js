const redis = require('../config/redis');
const Product = require('../models/Product');

class CartController {
  static async getCart(req, res) {
    try {
      const userId = req.user.id;
      const cartKey = `cart:${userId}`;

      if (!redis.isConnected()) {
        return res.json({
          success: true,
          data: { items: [], total: 0 },
          message: 'Cart retrieved successfully'
        });
      }

      const cart = await redis.get(cartKey);
      const cartData = cart ? JSON.parse(cart) : { items: [], total: 0 };

      res.json({
        success: true,
        data: cartData,
        message: 'Cart retrieved successfully'
      });
    } catch (error) {
      console.error('Get cart error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get cart'
      });
    }
  }

  static async addToCart(req, res) {
    try {
      const userId = req.user.id;
      const { productId, quantity = 1 } = req.body;
      const cartKey = `cart:${userId}`;

      // Validate product
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      if (product.inventory < quantity) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient inventory'
        });
      }

      if (!redis.isConnected()) {
        return res.status(503).json({
          success: false,
          error: 'Cart service unavailable'
        });
      }

      // Get current cart
      const cart = await redis.get(cartKey);
      const cartData = cart ? JSON.parse(cart) : { items: [], total: 0 };

      // Check if item already exists
      const existingItem = cartData.items.find(item => item.id === productId);
      
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cartData.items.push({
          id: productId,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity
        });
      }

      // Recalculate total
      cartData.total = cartData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Save cart (expires in 7 days)
      await redis.set(cartKey, cartData, 7 * 24 * 3600);

      res.json({
        success: true,
        data: cartData,
        message: 'Item added to cart'
      });
    } catch (error) {
      console.error('Add to cart error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add item to cart'
      });
    }
  }

  static async updateCartItem(req, res) {
    try {
      const userId = req.user.id;
      const { productId } = req.params;
      const { quantity } = req.body;
      const cartKey = `cart:${userId}`;

      if (!redis.isConnected()) {
        return res.status(503).json({
          success: false,
          error: 'Cart service unavailable'
        });
      }

      const cart = await redis.get(cartKey);
      if (!cart) {
        return res.status(404).json({
          success: false,
          error: 'Cart not found'
        });
      }

      const cartData = JSON.parse(cart);
      const itemIndex = cartData.items.findIndex(item => item.id === productId);

      if (itemIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Item not found in cart'
        });
      }

      if (quantity <= 0) {
        cartData.items.splice(itemIndex, 1);
      } else {
        cartData.items[itemIndex].quantity = quantity;
      }

      // Recalculate total
      cartData.total = cartData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      await redis.set(cartKey, cartData, 7 * 24 * 3600);

      res.json({
        success: true,
        data: cartData,
        message: 'Cart updated successfully'
      });
    } catch (error) {
      console.error('Update cart error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update cart'
      });
    }
  }

  static async removeFromCart(req, res) {
    try {
      const userId = req.user.id;
      const { productId } = req.params;
      const cartKey = `cart:${userId}`;

      if (!redis.isConnected()) {
        return res.status(503).json({
          success: false,
          error: 'Cart service unavailable'
        });
      }

      const cart = await redis.get(cartKey);
      if (!cart) {
        return res.status(404).json({
          success: false,
          error: 'Cart not found'
        });
      }

      const cartData = JSON.parse(cart);
      cartData.items = cartData.items.filter(item => item.id !== productId);
      cartData.total = cartData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      await redis.set(cartKey, cartData, 7 * 24 * 3600);

      res.json({
        success: true,
        data: cartData,
        message: 'Item removed from cart'
      });
    } catch (error) {
      console.error('Remove from cart error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove item from cart'
      });
    }
  }

  static async clearCart(req, res) {
    try {
      const userId = req.user.id;
      const cartKey = `cart:${userId}`;

      if (redis.isConnected()) {
        await redis.del(cartKey);
      }

      res.json({
        success: true,
        message: 'Cart cleared successfully'
      });
    } catch (error) {
      console.error('Clear cart error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear cart'
      });
    }
  }
}

module.exports = CartController;