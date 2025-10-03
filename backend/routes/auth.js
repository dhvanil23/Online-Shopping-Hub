const express = require('express');
const AuthController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { authValidation } = require('../middleware/validation');
const handleValidation = require('../middleware/handleValidation');

const router = express.Router();

router.post('/register', authValidation.register, handleValidation, AuthController.register);

router.post('/login', authValidation.login, handleValidation, AuthController.login);

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authenticateToken, AuthController.getProfile);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticateToken, AuthController.logout);

module.exports = router;