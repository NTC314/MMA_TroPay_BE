const jwt = require('jsonwebtoken');
const { User, Wallet } = require('../models');
const logger = require('../utils/logger');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { phone, password, full_name, email } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this phone number already exists'
      });
    }

    // Create user
    const user = await User.create({
      phone,
      password,
      full_name,
      email
    });

    // Create wallet for user
    await Wallet.create({
      user_id: user._id,
      balance: 0,
      currency: 'VND'
    });

    // Generate token
    const token = generateToken(user._id);

    logger.info(`New user registered: ${user._id}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          phone: user.phone,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          kyc_status: user.kyc_status,
          is_phone_verified: user.is_phone_verified
        },
        token
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error registering user'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Check if user exists and get password
    const user = await User.findOne({ phone }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Update last login
    user.last_login = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    logger.info(`User logged in: ${user._id}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          phone: user.phone,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          kyc_status: user.kyc_status,
          is_phone_verified: user.is_phone_verified,
          is_email_verified: user.is_email_verified
        },
        token
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in'
    });
  }
};

// @desc    Verify phone number
// @route   POST /api/auth/verify-phone
// @access  Private
const verifyPhone = async (req, res) => {
  try {
    const { otp } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId).select('+otp +otp_expires');
    
    if (!user.verifyOTP(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    user.is_phone_verified = true;
    user.otp = undefined;
    user.otp_expires = undefined;
    await user.save();

    logger.info(`Phone verified for user: ${userId}`);

    res.json({
      success: true,
      message: 'Phone number verified successfully'
    });
  } catch (error) {
    logger.error('Phone verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying phone number'
    });
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Private
const resendOTP = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    const otp = user.generateOTP();
    await user.save();
    
    // TODO: Send SMS with OTP
    // await smsService.sendOTP(user.phone, otp);
    
    logger.info(`OTP resent for user: ${userId}`);

    res.json({
      success: true,
      message: 'OTP sent successfully',
      ...(process.env.NODE_ENV === 'development' && { otp }) // Only in development
    });
  } catch (error) {
    logger.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending OTP'
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId).select('+password');
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(current_password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = new_password;
    await user.save();

    logger.info(`Password changed for user: ${userId}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password'
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    // TODO: Implement forgot password logic
    res.json({
      success: true,
      message: 'Password reset instructions sent to your phone'
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing forgot password request'
    });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    // TODO: Implement reset password logic
    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password'
    });
  }
};

module.exports = {
  register,
  login,
  verifyPhone,
  resendOTP,
  changePassword,
  forgotPassword,
  resetPassword
};