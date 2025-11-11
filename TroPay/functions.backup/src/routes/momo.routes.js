const express = require('express');
const router = express.Router();
const momoController = require('../controllers/momo.controller');
const { auth } = require('../middleware/auth');

/**
 * @route   POST /api/momo/create-payment
 * @desc    Create MoMo payment
 * @access  Private (Tenant)
 */
router.post('/create-payment', auth, momoController.createPayment);

/**
 * @route   GET /api/momo/callback
 * @desc    Handle MoMo return URL (user redirect after payment)
 * @access  Public
 */
router.get('/callback', momoController.handleCallback);

/**
 * @route   POST /api/momo/callback
 * @desc    Handle MoMo IPN notification (server-to-server)
 * @access  Public
 */
router.post('/callback', momoController.handleCallback);

/**
 * @route   POST /api/momo/query
 * @desc    Query MoMo transaction status
 * @access  Private
 */
router.post('/query', auth, momoController.queryTransaction);

/**
 * @route   GET /api/momo/check-status/:orderId
 * @desc    Check payment status from database (for WebView polling)
 * @access  Public
 */
router.get('/check-status/:orderId', momoController.checkPaymentStatus);

module.exports = router;
