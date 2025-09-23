const express = require('express');
const { getProfile, updateProfile, uploadAvatar, getWallet, updateKYC } = require('../controllers/user.controller');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 */

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', auth, getProfile);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *               email:
 *                 type: string
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Bad request
 */
router.put('/profile', auth, updateProfile);

/**
 * @swagger
 * /api/users/avatar:
 *   post:
 *     summary: Upload user avatar
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 *       400:
 *         description: Bad request
 */
router.post('/avatar', auth, upload.single('avatar'), uploadAvatar);

/**
 * @swagger
 * /api/users/wallet:
 *   get:
 *     summary: Get user wallet information
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet information retrieved successfully
 *       404:
 *         description: Wallet not found
 */
router.get('/wallet', auth, getWallet);

/**
 * @swagger
 * /api/users/kyc:
 *   put:
 *     summary: Update KYC information
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               id_card_number:
 *                 type: string
 *               id_card_front:
 *                 type: string
 *                 format: binary
 *               id_card_back:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: KYC information updated successfully
 *       400:
 *         description: Bad request
 */
router.put('/kyc', auth, upload.fields([
  { name: 'id_card_front', maxCount: 1 },
  { name: 'id_card_back', maxCount: 1 }
]), updateKYC);

module.exports = router;