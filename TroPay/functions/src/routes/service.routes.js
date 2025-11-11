const express = require('express');
const router = express.Router();

// Import controllers
const {
  getServiceTypes,
  getServiceRates,
  updateServiceRates,
  getMeterReadings,
  createMeterReadings
} = require('../controllers/service.controller');

// Import middleware
const { auth, ownerOnly } = require('../middleware/auth');

/**
 * @desc    Routes for Service Management
 * @prefix  /api/services
 */

// @route   GET /api/services/types
// @desc    Get service types
// @access  Public
router.get('/types', getServiceTypes);

// @route   GET /api/services/rates
// @desc    Get service rates for owner
// @access  Private (Owner only)
router.get('/rates', auth, ownerOnly, getServiceRates);

// @route   PUT /api/services/rates
// @desc    Update service rates
// @access  Private (Owner only)
router.put('/rates', auth, ownerOnly, updateServiceRates);

// @route   GET /api/services/meter-readings
// @desc    Get meter readings
// @access  Private (Owner only)
router.get('/meter-readings', auth, ownerOnly, getMeterReadings);

// @route   POST /api/services/meter-readings
// @desc    Create/Update meter readings
// @access  Private (Owner only)
router.post('/meter-readings', auth, ownerOnly, createMeterReadings);

module.exports = router;





