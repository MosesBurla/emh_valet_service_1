const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendOTP } = require('../utils/notifier');
const ApiResponse = require('../utils/responseHelper');

// Store OTPs temporarily (in production, use Redis or similar)
const otpStore = new Map();

const register = async (req, res) => {
  const { name, phone, email, password, role, licenseDetails, defaultLocation } = req.body;
  try {
    let user = await User.findOne({ phone });
    if (user) {
      return ApiResponse.conflict('User already exists with this phone number').send(res);
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

    return ApiResponse.created({
      userId: user._id,
      requiresVerification: true
    }, 'Registration successful. Please verify your phone number with OTP.').send(res);
  } catch (err) {
    console.error('Registration error:', err);
    return ApiResponse.error('ServerError', err.message || 'Registration failed').send(res);
  }
};

const sendOtp = async (req, res) => {
  const { phone } = req.body;
  try {
    if (!phone) {
      return ApiResponse.badRequest('Phone number is required').send(res);
    }

    // Check if user exists
    const user = await User.findOne({ phone });
    if (!user) {
      return ApiResponse.notFound('User not found. Please register first.').send(res);
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(phone, { otp, timestamp: Date.now() });

    // In production, send actual SMS
    console.log(`OTP for ${phone}: ${otp}`);
    // sendOTP(phone, otp); // Uncomment when SMS service is configured

    return ApiResponse.success({ sessionInfo: 'otp_sent' }, 'OTP sent successfully').send(res);
  } catch (err) {
    console.error('Send OTP error:', err);
    return ApiResponse.error('ServerError', err.message || 'Failed to send OTP').send(res);
  }
};

const verifyOtp = async (req, res) => {
  const { phone, otp, fcmToken } = req.body;
  try {
    if (!phone || !otp) {
      return ApiResponse.badRequest('Phone number and OTP are required').send(res);
    }

    // Check if user exists
    const user = await User.findOne({ phone });
    if (!user) {
      return ApiResponse.notFound('User not found').send(res);
    }

    // Check if account is approved
    if (user.status !== 'approved') {
      return ApiResponse.forbidden('Account pending approval').send(res);
    }

    // Verify OTP
    const storedOtp = otpStore.get(phone);
    if (!storedOtp) {
      return ApiResponse.unauthorized('OTP expired or not found. Please request a new one.').send(res);
    }

    // Check if OTP is expired (5 minutes)
    const isExpired = Date.now() - storedOtp.timestamp > 5 * 60 * 1000;
    if (isExpired) {
      otpStore.delete(phone);
      return ApiResponse.unauthorized('OTP expired. Please request a new one.').send(res);
    }

    // Check if OTP matches (default OTP is 123456 for development)
    if (otp !== '123456' && storedOtp.otp !== otp) {
      return ApiResponse.unauthorized('Invalid OTP').send(res);
    }

    // OTP verified successfully, remove from store
    otpStore.delete(phone);

    // Store FCM token if provided
    if (fcmToken) {
      user.fcmToken = fcmToken;
      await user.save();
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role, phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return ApiResponse.success({
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
    }, 'Login successful').send(res);
  } catch (err) {
    console.error('Verify OTP error:', err);
    return ApiResponse.error('ServerError', err.message || 'Verification failed').send(res);
  }
};

const login = async (req, res) => {
  const { phone } = req.body;
  try {
    if (!phone) {
      return ApiResponse.badRequest('Phone number is required').send(res);
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return ApiResponse.notFound('User not found. Please register first.').send(res);
    }

    if (user.status !== 'approved') {
      return ApiResponse.forbidden('Account pending approval').send(res);
    }

    // Generate OTP for login
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(phone, { otp, timestamp: Date.now() });

    // In production, send actual SMS
    console.log(`Login OTP for ${phone}: ${otp}`);
    // sendOTP(phone, otp); // Uncomment when SMS service is configured

    return ApiResponse.success({ requiresVerification: true }, 'OTP sent to your phone number').send(res);
  } catch (err) {
    console.error('Login error:', err);
    return ApiResponse.error('ServerError', err.message || 'Login failed').send(res);
  }
};

const forgotPassword = async (req, res) => {
  const { phone } = req.body;
  try {
    const user = await User.findOne({ phone });
    if (!user) return ApiResponse.notFound('User not found').send(res);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(`reset_${phone}`, { otp, timestamp: Date.now() });

    console.log(`Password reset OTP for ${phone}: ${otp}`);
    // sendOTP(phone, otp); // Uncomment when SMS service is configured

    return ApiResponse.success(null, 'Password reset OTP sent').send(res);
  } catch (err) {
    return ApiResponse.error('ServerError', err.message || 'Failed to send reset OTP').send(res);
  }
};

const resetPassword = async (req, res) => {
  const { phone, otp, password } = req.body;
  try {
    if (!phone || !otp || !password) {
      return ApiResponse.badRequest('Phone, OTP, and password are required').send(res);
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return ApiResponse.notFound('User not found').send(res);
    }

    // Verify reset OTP
    const storedOtp = otpStore.get(`reset_${phone}`);
    if (!storedOtp) {
      return ApiResponse.unauthorized('OTP expired or not found').send(res);
    }

    // Check if OTP is expired (5 minutes)
    const isExpired = Date.now() - storedOtp.timestamp > 5 * 60 * 1000;
    if (isExpired) {
      otpStore.delete(`reset_${phone}`);
      return ApiResponse.unauthorized('OTP expired').send(res);
    }

    // Check if OTP matches
    if (storedOtp.otp !== otp) {
      return ApiResponse.unauthorized('Invalid OTP').send(res);
    }

    // Update password and remove OTP
    user.password = password;
    await user.save();
    otpStore.delete(`reset_${phone}`);

    return ApiResponse.success(null, 'Password reset successful').send(res);
  } catch (err) {
    return ApiResponse.error('ServerError', err.message || 'Password reset failed').send(res);
  }
};

module.exports = { register, login, sendOtp, verifyOtp, forgotPassword, resetPassword };
