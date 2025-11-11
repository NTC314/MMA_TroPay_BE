const express = require('express');
const router = express.Router();

// Import controllers
const {
  getTenantRoom,
  getOwnerRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom
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

// @route   POST /api/rooms
// @desc    Create new room
// @access  Private (Owner only)
router.post('/', auth, ownerOnly, createRoom);

// @route   GET /api/rooms/:id
// @desc    Get room details by ID
// @access  Private (Owner/Admin)
router.get('/:id', auth, ownerOrAdmin, validateObjectId('id'), getRoomById);

// @route   PUT /api/rooms/:id
// @desc    Update room
// @access  Private (Owner only)
router.put('/:id', auth, ownerOnly, validateObjectId('id'), updateRoom);

// @route   DELETE /api/rooms/:id
// @desc    Delete room
// @access  Private (Owner only)
router.delete('/:id', auth, ownerOnly, validateObjectId('id'), deleteRoom);

module.exports = router;