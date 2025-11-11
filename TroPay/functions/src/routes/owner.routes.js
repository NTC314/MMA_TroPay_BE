const express = require('express');
const router = express.Router();

// Import controllers
const {
  getOwnerDashboard,
  getOwnerRoomsWithSearch,
  getRoomDetails
} = require('../controllers/owner.controller');

// Import middleware
const { auth, ownerOnly } = require('../middleware/auth');

// Import validators
const { validateObjectId } = require('../validators/room.validator');

/**
 * @desc    Routes for Owner dashboard and management
 * @prefix  /api/owner
 */

// @route   GET /api/owner/dashboard
// @desc    Get owner dashboard statistics and data
// @access  Private (Owner only)
router.get('/dashboard', auth, ownerOnly, getOwnerDashboard);

// @route   GET /api/owner/rooms
// @desc    Get owner's rooms with search and filters
// @access  Private (Owner only)
router.get('/rooms', auth, ownerOnly, getOwnerRoomsWithSearch);

// @route   GET /api/owner/rooms/:id/details
// @desc    Get room details with full information
// @access  Private (Owner only)
router.get('/rooms/:id/details', auth, ownerOnly, validateObjectId('id'), getRoomDetails);

module.exports = router;





