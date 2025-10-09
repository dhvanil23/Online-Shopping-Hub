const express = require('express');
const ReviewController = require('../controllers/reviewController');
const { authenticateToken } = require('../middleware/auth');
const { body, param } = require('express-validator');
const handleValidation = require('../middleware/handleValidation');

const router = express.Router();

// Get product reviews
router.get('/product/:productId', 
  param('productId').isUUID().withMessage('Valid product ID required'),
  handleValidation,
  ReviewController.getProductReviews
);

// Create review
router.post('/', 
  authenticateToken,
  body('productId').isUUID().withMessage('Valid product ID required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim().isLength({ min: 0, max: 500 }).withMessage('Comment must be less than 500 characters'),
  handleValidation,
  ReviewController.createReview
);

// Update review
router.put('/:id',
  authenticateToken,
  param('id').isUUID().withMessage('Valid review ID required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim().isLength({ min: 0, max: 500 }).withMessage('Comment must be less than 500 characters'),
  handleValidation,
  ReviewController.updateReview
);

// Delete review
router.delete('/:id',
  authenticateToken,
  param('id').isUUID().withMessage('Valid review ID required'),
  handleValidation,
  ReviewController.deleteReview
);

module.exports = router;