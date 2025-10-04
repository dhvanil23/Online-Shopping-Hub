const express = require('express');
const CartController = require('../controllers/cartController');
const { authenticateToken } = require('../middleware/auth');
const { body, param } = require('express-validator');
const handleValidation = require('../middleware/handleValidation');

const router = express.Router();

// Get cart
router.get('/', authenticateToken, CartController.getCart);

// Add to cart
router.post('/', 
  authenticateToken,
  body('productId').isUUID().withMessage('Valid product ID required'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be positive integer'),
  handleValidation,
  CartController.addToCart
);

// Update cart item
router.put('/:productId',
  authenticateToken,
  param('productId').isUUID().withMessage('Valid product ID required'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be non-negative integer'),
  handleValidation,
  CartController.updateCartItem
);

// Remove from cart
router.delete('/:productId',
  authenticateToken,
  param('productId').isUUID().withMessage('Valid product ID required'),
  handleValidation,
  CartController.removeFromCart
);

// Clear cart
router.delete('/', authenticateToken, CartController.clearCart);

module.exports = router;