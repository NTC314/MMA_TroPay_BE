const { User, Wallet } = require('../models');
const logger = require('../utils/logger');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving profile'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { full_name, email, date_of_birth, address } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    
    if (full_name) user.full_name = full_name;
    if (email) user.email = email;
    if (date_of_birth) user.date_of_birth = date_of_birth;
    if (address) user.address = address;

    await user.save();

    logger.info(`Profile updated for user: ${userId}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
};

// @desc    Upload user avatar
// @route   POST /api/users/avatar
// @access  Private
const uploadAvatar = async (req, res) => {
  try {
    // TODO: Implement file upload to Cloudinary
    const userId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // For now, just return a placeholder URL
    const avatarUrl = `https://example.com/avatars/${userId}.jpg`;

    await User.findByIdAndUpdate(userId, { avatar: avatarUrl });

    logger.info(`Avatar uploaded for user: ${userId}`);

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: { avatar_url: avatarUrl }
    });
  } catch (error) {
    logger.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading avatar'
    });
  }
};

// @desc    Get user wallet
// @route   GET /api/users/wallet
// @access  Private
const getWallet = async (req, res) => {
  try {
    const userId = req.user.id;

    const wallet = await Wallet.findOne({ user_id: userId });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    res.json({
      success: true,
      data: { wallet }
    });
  } catch (error) {
    logger.error('Get wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving wallet'
    });
  }
};

// @desc    Update KYC information
// @route   PUT /api/users/kyc
// @access  Private
const updateKYC = async (req, res) => {
  try {
    const { id_card_number } = req.body;
    const userId = req.user.id;

    // TODO: Implement file upload to Cloudinary for ID card images
    const id_card_front_url = req.files?.id_card_front ? 
      `https://example.com/kyc/${userId}_front.jpg` : null;
    const id_card_back_url = req.files?.id_card_back ? 
      `https://example.com/kyc/${userId}_back.jpg` : null;

    const updateData = {
      kyc_status: 'pending'
    };

    if (id_card_number) updateData.id_card_number = id_card_number;
    if (id_card_front_url) updateData.id_card_front_image = id_card_front_url;
    if (id_card_back_url) updateData.id_card_back_image = id_card_back_url;

    await User.findByIdAndUpdate(userId, updateData);

    logger.info(`KYC information updated for user: ${userId}`);

    res.json({
      success: true,
      message: 'KYC information updated successfully. Please wait for verification.'
    });
  } catch (error) {
    logger.error('Update KYC error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating KYC information'
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadAvatar,
  getWallet,
  updateKYC
};