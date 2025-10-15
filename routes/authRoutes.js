const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Legacy routes (keeping for backward compatibility)
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// New OTP-based authentication routes
router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);

module.exports = router;
