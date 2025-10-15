const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendOTP } = require('../utils/notifier');

// Store OTPs temporarily (in production, use Redis or similar)
const otpStore = new Map();

const register = async (req, res) => {
  const { name, phone, email, password, role, licenseDetails, defaultLocation } = req.body;
  try {
    let user = await User.findOne({ phone });
    if (user) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this phone number'
      });
    }

    // Password is now optional since we use OTP for login
    user = new User({ name, phone, email, role, licenseDetails, defaultLocation });
    if (password) user.password = password; // Only set password if provided
    if (role === 'owner') user.status = 'approved';
    await user.save();

    // Send OTP for verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(phone, { otp, timestamp: Date.now() });

    // In production, send actual SMS
    console.log(`OTP for ${phone}: ${otp}`);
    // sendOTP(phone, otp); // Uncomment when SMS service is configured

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your phone number with OTP.',
      userId: user._id,
      requiresVerification: true
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Registration failed'
    });
  }
};

const sendOtp = async (req, res) => {
  const { phone } = req.body;
  try {
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Check if user exists
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please register first.'
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(phone, { otp, timestamp: Date.now() });

    // In production, send actual SMS
    console.log(`OTP for ${phone}: ${otp}`);
    // sendOTP(phone, otp); // Uncomment when SMS service is configured

    res.json({
      success: true,
      message: 'OTP sent successfully',
      sessionInfo: 'otp_sent'
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to send OTP'
    });
  }
};

const verifyOtp = async (req, res) => {
  const { phone, otp } = req.body;
  try {
    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required'
      });
    }

    // Check if user exists
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if account is approved
    if (user.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Account pending approval'
      });
    }

    // Verify OTP
    const storedOtp = otpStore.get(phone);
    if (!storedOtp) {
      return res.status(401).json({
        success: false,
        message: 'OTP expired or not found. Please request a new one.'
      });
    }

    // Check if OTP is expired (5 minutes)
    const isExpired = Date.now() - storedOtp.timestamp > 5 * 60 * 1000;
    if (isExpired) {
      otpStore.delete(phone);
      return res.status(401).json({
        success: false,
        message: 'OTP expired. Please request a new one.'
      });
    }

    // Check if OTP matches (default OTP is 123456 for development)
    if (otp !== '123456' && storedOtp.otp !== otp) {
      return res.status(401).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // OTP verified successfully, remove from store
    otpStore.delete(phone);

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role, phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        photoUrl: user.photoUrl,
        rating: user.rating,
        status: user.status
      }
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Verification failed'
    });
  }
};

const login = async (req, res) => {
  const { phone } = req.body;
  try {
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please register first.'
      });
    }

    if (user.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Account pending approval'
      });
    }

    // Generate OTP for login
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(phone, { otp, timestamp: Date.now() });

    // In production, send actual SMS
    console.log(`Login OTP for ${phone}: ${otp}`);
    // sendOTP(phone, otp); // Uncomment when SMS service is configured

    res.json({
      success: true,
      message: 'OTP sent to your phone number',
      requiresVerification: true
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Login failed'
    });
  }
};

const forgotPassword = async (req, res) => {
  const { phone } = req.body;
  try {
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(`reset_${phone}`, { otp, timestamp: Date.now() });

    console.log(`Password reset OTP for ${phone}: ${otp}`);
    // sendOTP(phone, otp); // Uncomment when SMS service is configured

    res.json({
      success: true,
      message: 'Password reset OTP sent'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to send reset OTP'
    });
  }
};

const resetPassword = async (req, res) => {
  const { phone, otp, password } = req.body;
  try {
    if (!phone || !otp || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone, OTP, and password are required'
      });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify reset OTP
    const storedOtp = otpStore.get(`reset_${phone}`);
    if (!storedOtp) {
      return res.status(401).json({
        success: false,
        message: 'OTP expired or not found'
      });
    }

    // Check if OTP is expired (5 minutes)
    const isExpired = Date.now() - storedOtp.timestamp > 5 * 60 * 1000;
    if (isExpired) {
      otpStore.delete(`reset_${phone}`);
      return res.status(401).json({
        success: false,
        message: 'OTP expired'
      });
    }

    // Check if OTP matches
    if (storedOtp.otp !== otp) {
      return res.status(401).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Update password and remove OTP
    user.password = password;
    await user.save();
    otpStore.delete(`reset_${phone}`);

    res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Password reset failed'
    });
  }
};

module.exports = { register, login, sendOtp, verifyOtp, forgotPassword, resetPassword };
