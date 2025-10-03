const express = require('express');
const OrderController = require('../controllers/orderController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { orderValidation, commonValidation } = require('../middleware/validation');
const handleValidation = require('../middleware/handleValidation');

const router = express.Router();

router.post('/', 
  authenticateToken, 
  orderValidation.create, 
  handleValidation,
  OrderController.createOrder
);

router.get('/', authenticateToken, OrderController.getOrders);

router.get('/stats', 
  authenticateToken, 
  requireRole('admin'), 
  OrderController.getOrderStats
);

router.get('/:id', 
  authenticateToken, 
  commonValidation.idParam, 
  handleValidation,
  OrderController.getOrder
);

router.put('/:id/status', 
  authenticateToken, 
  requireRole('admin'), 
  orderValidation.updateStatus, 
  handleValidation,
  OrderController.updateOrderStatus
);

router.post('/:id/cancel', 
  authenticateToken, 
  commonValidation.idParam, 
  handleValidation,
  OrderController.cancelOrder
);

module.exports = router;