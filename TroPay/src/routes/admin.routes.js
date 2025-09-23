const express = require('express');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin management endpoints
 */

// All admin routes require authentication and admin role
router.use(auth);
router.use(authorize('admin', 'super_admin'));

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Admin]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       403:
 *         description: Access denied
 */
router.get('/users', (req, res) => {
  res.json({ message: 'Get all users - Admin endpoint' });
});

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Get user by ID (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       404:
 *         description: User not found
 */
router.get('/users/:id', (req, res) => {
  res.json({ message: `Get user ${req.params.id} - Admin endpoint` });
});

/**
 * @swagger
 * /api/admin/users/{id}/status:
 *   put:
 *     summary: Update user status (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               is_active:
 *                 type: boolean
 *               kyc_status:
 *                 type: string
 *                 enum: [pending, verified, rejected]
 *     responses:
 *       200:
 *         description: User status updated successfully
 *       404:
 *         description: User not found
 */
router.put('/users/:id/status', (req, res) => {
  res.json({ message: `Update user ${req.params.id} status - Admin endpoint` });
});

/**
 * @swagger
 * /api/admin/transactions:
 *   get:
 *     summary: Get all transactions (Admin only)
 *     tags: [Admin]
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
 *         name: status
 *         schema:
 *           type: string
 *         description: Transaction status filter
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 *       403:
 *         description: Access denied
 */
router.get('/transactions', (req, res) => {
  res.json({ message: 'Get all transactions - Admin endpoint' });
});

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard data
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *       403:
 *         description: Access denied
 */
router.get('/dashboard', (req, res) => {
  res.json({ 
    message: 'Admin dashboard data',
    data: {
      totalUsers: 0,
      totalTransactions: 0,
      totalVolume: 0,
      pendingKYC: 0
    }
  });
});

module.exports = router;