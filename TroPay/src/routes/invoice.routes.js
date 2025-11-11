const express = require('express');
const router = express.Router();

// Import controllers
const {
  getInvoices,
  getInvoiceStats,
  getInvoiceDetails,
  createInvoice
} = require('../controllers/invoice.controller');

// Import middleware
const { auth, ownerOnly } = require('../middleware/auth');

/**
 * @desc    Routes for Invoice Management
 * @prefix  /api/invoices
 */

// @route   GET /api/invoices
// @desc    Get invoices for owner with filters
// @access  Private (Owner only)
router.get('/', auth, ownerOnly, getInvoices);

// @route   GET /api/invoices/stats
// @desc    Get invoice statistics
// @access  Private (Owner only)
router.get('/stats', auth, ownerOnly, getInvoiceStats);

// @route   GET /api/invoices/:id
// @desc    Get invoice details
// @access  Private (Owner only)
router.get('/:id', auth, ownerOnly, getInvoiceDetails);

// @route   POST /api/invoices
// @desc    Create invoice
// @access  Private (Owner only)
router.post('/', auth, ownerOnly, createInvoice);

module.exports = router;





