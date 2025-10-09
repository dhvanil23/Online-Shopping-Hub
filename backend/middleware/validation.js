const { body, param, query } = require('express-validator');

const authValidation = {
  register: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
    body('role')
      .optional()
      .isIn(['customer', 'admin'])
      .withMessage('Role must be either customer or admin')
  ],

  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ]
};

const productValidation = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Product name must be between 2 and 100 characters'),
    body('description')
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Description must be between 10 and 1000 characters'),
    body('price')
      .isFloat({ min: 0.01 })
      .withMessage('Price must be a positive number'),
    body('category')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Category must be between 2 and 50 characters'),
    body('inventory')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Inventory must be a non-negative integer'),
    body('image')
      .optional()
      .isURL()
      .withMessage('Image must be a valid URL')
  ],

  update: [
    param('id')
      .isUUID()
      .withMessage('Valid product ID is required'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Product name must be between 2 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Description must be between 10 and 1000 characters'),
    body('price')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Price must be a positive number'),
    body('category')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Category must be between 2 and 50 characters'),
    body('inventory')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Inventory must be a non-negative integer'),
    body('image')
      .optional()
      .isURL()
      .withMessage('Image must be a valid URL')
  ],

  getProducts: [
    query('cursor')
      .optional()
      .isString()
      .withMessage('Cursor must be a string'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('sortBy')
      .optional()
      .isIn(['name', 'price', 'createdAt', 'category'])
      .withMessage('Invalid sort field'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc'),
    query('minPrice')
      .optional({ checkFalsy: true })
      .isFloat({ min: 0 })
      .withMessage('Min price must be a positive number'),
    query('maxPrice')
      .optional({ checkFalsy: true })
      .isFloat({ min: 0 })
      .withMessage('Max price must be a positive number')
  ]
};

const orderValidation = {
  create: [
    body('items')
      .isArray({ min: 1 })
      .withMessage('Items array is required and must not be empty'),
    body('items.*.productId')
      .isUUID()
      .withMessage('Each item must have a valid product ID'),
    body('items.*.quantity')
      .isInt({ min: 1 })
      .withMessage('Each item must have a positive quantity'),
    body('totalAmount')
      .isFloat({ min: 0.01 })
      .withMessage('Total amount must be a positive number'),
    body('shippingAddress')
      .optional()
      .isObject()
      .withMessage('Shipping address must be an object')
  ],

  updateStatus: [
    param('id')
      .isUUID()
      .withMessage('Valid order ID is required'),
    body('status')
      .isIn(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'])
      .withMessage('Invalid order status')
  ]
};

const commonValidation = {
  idParam: [
    param('id')
      .isUUID()
      .withMessage('Valid ID is required')
  ]
};

module.exports = {
  authValidation,
  productValidation,
  orderValidation,
  commonValidation
};