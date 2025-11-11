const express = require('express');
const router = express.Router();

// Import controllers
const {
  getFeedbackOverview,
  getReviews
} = require('../controllers/feedback.controller');

// Import middleware
const { auth, ownerOnly } = require('../middleware/auth');

/**
 * @desc    Routes for Feedback Management
 * @prefix  /api/feedback
 */

// @route   GET /api/feedback/overview
// @desc    Get feedback overview for owner
// @access  Private (Owner only)
router.get('/overview', auth, ownerOnly, getFeedbackOverview);

// @route   GET /api/feedback/reviews
// @desc    Get all reviews for owner
// @access  Private (Owner only)
router.get('/reviews', auth, ownerOnly, getReviews);

module.exports = router;





