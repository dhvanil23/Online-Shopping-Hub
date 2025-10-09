const Order = require('../models/Order');
const Product = require('../models/Product');
const redis = require('../config/redis');

class OrderController {
  static async createOrder(req, res) {
    try {
      const { items, totalAmount, shippingAddress } = req.body;
      const userId = req.user.id;

      // Validate items and check inventory
      for (const item of items) {
        const product = await Product.findById(item.productId);
        if (!product) {
          return res.status(400).json({ 
            success: false, 
            error: `Product not found` 
          });
        }
        
        if (product.inventory < item.quantity) {
          return res.status(400).json({ 
            success: false, 
            error: `Insufficient inventory for ${product.name}` 
          });
        }
      }

      const order = await Order.create({
        userId,
        items,
        totalAmount,
        shippingAddress
      });

      for (const item of items) {
        await Product.updateInventory(item.productId, item.quantity);
      }

      // Clear user's order cache
      if (redis.isConnected()) {
        const keys = await redis.getClient().keys(`orders:${userId}:*`);
        if (keys.length > 0) {
          await redis.getClient().del(keys);
        }
      }

      // Emit real-time notification
      if (req.io) {
        req.io.to(`user_${userId}`).emit('orderCreated', {
          orderId: order.id,
          status: order.status,
          totalAmount: order.totalAmount
        });
        
        // Notify admins
        req.io.emit('newOrder', {
          orderId: order.id,
          userId,
          totalAmount: order.totalAmount
        });
      }

      res.status(201).json({ 
        success: true, 
        data: order,
        message: 'Order created successfully'
      });
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create order' 
      });
    }
  }

  static async getOrders(req, res) {
    try {
      const { page, limit, status } = req.query;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      const cacheKey = `orders:${userId}:${JSON.stringify(req.query)}`;

      // Try cache first
      if (redis.isConnected()) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }
      }

      let result;
      
      if (isAdmin) {
        result = await Order.findAll({ page, limit, status });
      } else {
        result = await Order.findByUserId(userId, { page, limit });
      }

      const response = {
        success: true,
        data: result,
        message: 'Orders retrieved successfully'
      };

      // Cache result
      if (redis.isConnected()) {
        await redis.set(cacheKey, response, 180); // 3 minutes
      }

      res.json(response);
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch orders' 
      });
    }
  }

  static async getOrder(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.role === 'admin' ? null : req.user.id;

      const order = await Order.findById(id, userId);
      
      if (!order) {
        return res.status(404).json({ 
          success: false, 
          error: 'Order not found' 
        });
      }

      res.json({ 
        success: true, 
        data: order,
        message: 'Order retrieved successfully'
      });
    } catch (error) {
      console.error('Get order error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch order' 
      });
    }
  }

  static async updateOrderStatus(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          error: 'Admin access required' 
        });
      }

      const { id } = req.params;
      const { status } = req.body;

      // Get order first to get userId
      const existingOrder = await Order.findById(id);
      if (!existingOrder) {
        return res.status(404).json({ 
          success: false, 
          error: 'Order not found' 
        });
      }

      const order = await Order.updateStatus(id, status);
      
      if (!order) {
        return res.status(404).json({ 
          success: false, 
          error: 'Order not found' 
        });
      }

      // Emit real-time status update
      if (req.io) {
        console.log(`📡 Emitting order status update to user_${existingOrder.userId}:`, {
          orderId: order.id,
          status: order.status
        });
        req.io.to(`user_${existingOrder.userId}`).emit('orderStatusUpdate', {
          orderId: order.id,
          status: order.status,
          updatedAt: order.updatedAt
        });
      } else {
        console.log('⚠️ WebSocket not available for order status update');
      }

      res.json({ 
        success: true, 
        data: order,
        message: 'Order status updated successfully'
      });
    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update order status' 
      });
    }
  }

  static async getOrderStats(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          error: 'Admin access required' 
        });
      }

      const stats = await Order.getOrderStats();

      res.json({ 
        success: true, 
        data: stats,
        message: 'Order statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Get order stats error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch order statistics' 
      });
    }
  }

  static async cancelOrder(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.role === 'admin' ? null : req.user.id;

      const order = await Order.findById(id, userId);
      if (!order) {
        return res.status(404).json({ 
          success: false, 
          error: 'Order not found' 
        });
      }

      if (order.status !== 'pending' && order.status !== 'confirmed') {
        return res.status(400).json({ 
          success: false, 
          error: 'Order cannot be cancelled' 
        });
      }

      const updatedOrder = await Order.updateStatus(id, 'cancelled');

      const items = JSON.parse(order.items);
      for (const item of items) {
        await Product.updateInventory(item.productId, -item.quantity); // Negative to add back
      }

      res.json({ 
        success: true, 
        data: updatedOrder,
        message: 'Order cancelled successfully'
      });
    } catch (error) {
      console.error('Cancel order error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to cancel order' 
      });
    }
  }
}

module.exports = OrderController;