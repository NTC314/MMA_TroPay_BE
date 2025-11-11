const express = require('express');
const { auth } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment gateway endpoints
 */

// All routes require authentication
router.use(auth);

/**
 * @swagger
 * /api/payments/deposit:
 *   post:
 *     summary: Create deposit transaction
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - gateway
 *             properties:
 *               amount:
 *                 type: number
 *               gateway:
 *                 type: string
 *                 enum: [vnpay, momo]
 *     responses:
 *       200:
 *         description: Payment URL created successfully
 *       400:
 *         description: Bad request
 */
router.post('/deposit', (req, res) => {
  res.json({ 
    message: 'Create deposit transaction',
    payment_url: 'https://payment-gateway.com/pay'
  });
});

/**
 * @swagger
 * /api/payments/vnpay/callback:
 *   get:
 *     summary: VNPay payment callback
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: vnp_ResponseCode
 *         schema:
 *           type: string
 *         description: VNPay response code
 *     responses:
 *       200:
 *         description: Payment processed successfully
 */
router.get('/vnpay/callback', (req, res) => {
  res.json({ message: 'VNPay callback processed' });
});

/**
 * @swagger
 * /api/payments/momo/callback:
 *   post:
 *     summary: MoMo payment callback
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Payment processed successfully
 */
router.post('/momo/callback', (req, res) => {
  res.json({ message: 'MoMo callback processed' });
});

module.exports = router;