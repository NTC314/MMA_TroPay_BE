const express = require('express');
const router = express.Router();

// Import controllers
const {
  getMaintenanceRequests,
  updateMaintenanceStatus,
  getMaintenanceRequestDetails
} = require('../controllers/maintenance.controller');

// Import middleware
const { auth, ownerOnly } = require('../middleware/auth');

/**
 * @desc    Routes for Maintenance/Incident Management
 * @prefix  /api/maintenance
 */

// @route   GET /api/maintenance
// @desc    Get maintenance requests for owner with filters
// @access  Private (Owner only)
router.get('/', auth, ownerOnly, getMaintenanceRequests);

// @route   GET /api/maintenance/:id
// @desc    Get maintenance request details
// @access  Private (Owner only)
router.get('/:id', auth, ownerOnly, getMaintenanceRequestDetails);

// @route   PUT /api/maintenance/:id/status
// @desc    Update maintenance request status
// @access  Private (Owner only)
router.put('/:id/status', auth, ownerOnly, updateMaintenanceStatus);

module.exports = router;





