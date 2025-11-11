const express = require('express');
const { auth } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Transaction management endpoints
 */

// All routes require authentication
router.use(auth);

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Get user transactions
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Transaction type filter
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', (req, res) => {
  res.json({ message: 'Get user transactions' });
});

/**
 * @swagger
 * /api/transactions/{id}:
 *   get:
 *     summary: Get transaction by ID
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Transaction retrieved successfully
 *       404:
 *         description: Transaction not found
 */
router.get('/:id', (req, res) => {
  res.json({ message: `Get transaction ${req.params.id}` });
});

/**
 * @swagger
 * /api/transactions/transfer:
 *   post:
 *     summary: Transfer money to another user
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiver_phone
 *               - amount
 *               - pin
 *             properties:
 *               receiver_phone:
 *                 type: string
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *               pin:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transfer completed successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Insufficient funds or invalid PIN
 */
router.post('/transfer', (req, res) => {
  res.json({ message: 'Transfer money' });
});

module.exports = router;