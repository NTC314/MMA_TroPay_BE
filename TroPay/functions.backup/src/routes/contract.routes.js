const express = require('express');
const router = express.Router();

// Import controllers
const {
  getContracts,
  getContractDetails,
  createContract,
  updateContract,
  terminateContract
} = require('../controllers/contract.controller');

// Import middleware
const { auth, ownerOnly } = require('../middleware/auth');

/**
 * @desc    Routes for Contract management
 * @prefix  /api/contracts
 */

// @route   GET /api/contracts
// @desc    Get contracts list for owner
// @access  Private (Owner only)
router.get('/', auth, ownerOnly, getContracts);

// @route   POST /api/contracts
// @desc    Create contract
// @access  Private (Owner only)
router.post('/', auth, ownerOnly, createContract);

// @route   GET /api/contracts/:id
// @desc    Get contract details
// @access  Private (Owner only)
router.get('/:id', auth, ownerOnly, getContractDetails);

// @route   PUT /api/contracts/:id
// @desc    Update contract
// @access  Private (Owner only)
router.put('/:id', auth, ownerOnly, updateContract);

// @route   PUT /api/contracts/:id/terminate
// @desc    Terminate contract
// @access  Private (Owner only)
router.put('/:id/terminate', auth, ownerOnly, terminateContract);

module.exports = router;
