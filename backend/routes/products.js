const express = require('express');
const ProductController = require('../controllers/productController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { productValidation, commonValidation } = require('../middleware/validation');

const router = express.Router();

/**
 * @route   GET /api/v1/products
 * @desc    Get all products with filtering, sorting, and pagination
 * @access  Public
 */
router.get('/', productValidation.getProducts, ProductController.getProducts);

/**
 * @route   GET /api/v1/products/featured
 * @desc    Get featured products
 * @access  Public
 */
router.get('/featured', ProductController.getFeaturedProducts);

/**
 * @route   GET /api/v1/products/:id
 * @desc    Get single product by ID
 * @access  Public
 */
router.get('/:id', commonValidation.idParam, ProductController.getProduct);

/**
 * @route   POST /api/v1/products
 * @desc    Create a new product
 * @access  Private (Admin only)
 */
router.post('/', 
  authenticateToken, 
  requireRole('admin'), 
  productValidation.create, 
  ProductController.createProduct
);

/**
 * @route   PUT /api/v1/products/:id
 * @desc    Update a product
 * @access  Private (Admin only)
 */
router.put('/:id', 
  authenticateToken, 
  requireRole('admin'), 
  productValidation.update, 
  ProductController.updateProduct
);

/**
 * @route   DELETE /api/v1/products/:id
 * @desc    Delete a product (soft delete)
 * @access  Private (Admin only)
 */
router.delete('/:id', 
  authenticateToken, 
  requireRole('admin'), 
  commonValidation.idParam, 
  ProductController.deleteProduct
);

module.exports = router;