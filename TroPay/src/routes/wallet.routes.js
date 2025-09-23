const express = require('express');
const { auth } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Wallets
 *   description: Wallet management endpoints
 */

// All routes require authentication
router.use(auth);

/**
 * @swagger
 * /api/wallets/balance:
 *   get:
 *     summary: Get wallet balance
 *     tags: [Wallets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Balance retrieved successfully
 *       404:
 *         description: Wallet not found
 */
router.get('/balance', (req, res) => {
  res.json({ 
    message: 'Get wallet balance',
    balance: 0,
    currency: 'VND'
  });
});

module.exports = router;