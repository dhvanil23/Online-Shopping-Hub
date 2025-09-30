const express = require('express');
const OrderController = require('../controllers/orderController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { orderValidation, commonValidation } = require('../middleware/validation');

const router = express.Router();

/**
 * @route   POST /api/v1/orders
 * @desc    Create a new order
 * @access  Private
 */
router.post('/', 
  authenticateToken, 
  orderValidation.create, 
  OrderController.createOrder
);

/**
 * @route   GET /api/v1/orders
 * @desc    Get orders (user's orders or all orders for admin)
 * @access  Private
 */
router.get('/', authenticateToken, OrderController.getOrders);

/**
 * @route   GET /api/v1/orders/stats
 * @desc    Get order statistics
 * @access  Private (Admin only)
 */
router.get('/stats', 
  authenticateToken, 
  requireRole('admin'), 
  OrderController.getOrderStats
);

/**
 * @route   GET /api/v1/orders/:id
 * @desc    Get single order by ID
 * @access  Private
 */
router.get('/:id', 
  authenticateToken, 
  commonValidation.idParam, 
  OrderController.getOrder
);

/**
 * @route   PUT /api/v1/orders/:id/status
 * @desc    Update order status
 * @access  Private (Admin only)
 */
router.put('/:id/status', 
  authenticateToken, 
  requireRole('admin'), 
  orderValidation.updateStatus, 
  OrderController.updateOrderStatus
);

/**
 * @route   POST /api/v1/orders/:id/cancel
 * @desc    Cancel an order
 * @access  Private
 */
router.post('/:id/cancel', 
  authenticateToken, 
  commonValidation.idParam, 
  OrderController.cancelOrder
);

module.exports = router;