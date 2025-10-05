const express = require('express');
const router = express.Router();

// Import controllers
const {
  getTenantRoom,
  getOwnerRooms,
  getRoomById
} = require('../controllers/room.controller');

// Import middleware
const { auth, tenantOnly, ownerOnly, ownerOrAdmin } = require('../middleware/auth');

// Import validators
const {
  validateObjectId,
  validateRoomQuery
} = require('../validators/room.validator');

/**
 * @desc    Routes for Room management
 * @prefix  /api/rooms
 */

// @route   GET /api/rooms/my-room
// @desc    Get tenant's current room information
// @access  Private (Tenant only)
router.get('/my-room', auth, tenantOnly, getTenantRoom);

// @route   GET /api/rooms/my-rooms
// @desc    Get owner's rooms list with pagination and filter
// @access  Private (Owner only)  
router.get('/my-rooms', auth, ownerOnly, validateRoomQuery, getOwnerRooms);

// @route   GET /api/rooms/:id
// @desc    Get room details by ID
// @access  Private (Owner/Admin)
router.get('/:id', auth, ownerOrAdmin, validateObjectId('id'), getRoomById);

module.exports = router;