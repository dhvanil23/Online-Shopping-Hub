const express = require('express');
const ProductController = require('../controllers/productController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { productValidation, commonValidation } = require('../middleware/validation');
const handleValidation = require('../middleware/handleValidation');

const router = express.Router();

router.get('/', productValidation.getProducts, handleValidation, ProductController.getProducts);

router.get('/featured', ProductController.getFeaturedProducts);

router.get('/:id', commonValidation.idParam, handleValidation, ProductController.getProduct);

router.post('/', 
  authenticateToken, 
  requireRole('admin'), 
  productValidation.create, 
  handleValidation,
  ProductController.createProduct
);

router.put('/:id', 
  authenticateToken, 
  requireRole('admin'), 
  productValidation.update, 
  handleValidation,
  ProductController.updateProduct
);

router.delete('/:id', 
  authenticateToken, 
  requireRole('admin'), 
  commonValidation.idParam, 
  handleValidation,
  ProductController.deleteProduct
);

module.exports = router;