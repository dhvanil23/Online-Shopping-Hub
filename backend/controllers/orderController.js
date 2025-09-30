const Order = require('../models/Order');
const Product = require('../models/Product');
const { validationResult } = require('express-validator');

class OrderController {
  static async createOrder(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const { items, totalAmount, shippingAddress } = req.body;
      const userId = req.user.id;

      // Validate items and check inventory
      for (const item of items) {
        const product = await Product.findById(item.id);
        if (!product) {
          return res.status(400).json({ 
            success: false, 
            error: `Product ${item.name} not found` 
          });
        }
        
        if (product.inventory < item.quantity) {
          return res.status(400).json({ 
            success: false, 
            error: `Insufficient inventory for ${product.name}` 
          });
        }
      }

      // Create order
      const order = await Order.create({
        userId,
        items,
        totalAmount,
        shippingAddress
      });

      // Update inventory for each item
      for (const item of items) {
        await Product.updateInventory(item.id, item.quantity);
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

      let result;
      
      if (isAdmin) {
        result = await Order.findAll({ page, limit, status });
      } else {
        result = await Order.findByUserId(userId, { page, limit });
      }

      res.json({
        success: true,
        data: result,
        message: 'Orders retrieved successfully'
      });
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
      const { status } = req.body;

      const order = await Order.updateStatus(id, status);
      
      if (!order) {
        return res.status(404).json({ 
          success: false, 
          error: 'Order not found' 
        });
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
      // Check admin role
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

      // Find order
      const order = await Order.findById(id, userId);
      if (!order) {
        return res.status(404).json({ 
          success: false, 
          error: 'Order not found' 
        });
      }

      // Check if order can be cancelled
      if (order.status !== 'pending' && order.status !== 'confirmed') {
        return res.status(400).json({ 
          success: false, 
          error: 'Order cannot be cancelled' 
        });
      }

      // Update order status
      const updatedOrder = await Order.updateStatus(id, 'cancelled');

      // Restore inventory
      const items = JSON.parse(order.items);
      for (const item of items) {
        await Product.updateInventory(item.id, -item.quantity); // Negative to add back
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