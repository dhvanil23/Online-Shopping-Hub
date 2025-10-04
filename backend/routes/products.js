const express = require('express');
const ProductController = require('../controllers/productController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { productValidation, commonValidation } = require('../middleware/validation');
const handleValidation = require('../middleware/handleValidation');

const router = express.Router();

router.get('/', cache(300), productValidation.getProducts, handleValidation, ProductController.getProducts);

router.get('/featured', cache(600), ProductController.getFeaturedProducts);

router.get('/:id', cache(300), commonValidation.idParam, handleValidation, ProductController.getProduct);

router.post('/', 
  authenticateToken, 
  requireRole('admin'), 
  productValidation.create, 
  handleValidation,
  invalidateCache('cache:/api/v1/products*'),
  ProductController.createProduct
);

router.put('/:id', 
  authenticateToken, 
  requireRole('admin'), 
  productValidation.update, 
  handleValidation,
  invalidateCache('cache:/api/v1/products*'),
  ProductController.updateProduct
);

router.delete('/:id', 
  authenticateToken, 
  requireRole('admin'), 
  commonValidation.idParam, 
  handleValidation,
  invalidateCache('cache:/api/v1/products*'),
  ProductController.deleteProduct
);

module.exports = router;