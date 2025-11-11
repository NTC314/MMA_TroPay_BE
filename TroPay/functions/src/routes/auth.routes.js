const express = require('express');
const { register, login, logout, verifyPhone, resendOTP, changePassword, forgotPassword, resetPassword } = require('../controllers/auth.controller');
const { auth } = require('../middleware/auth');
const { validateRegister, validateLogin, validateChangePassword } = require('../validators/auth.validator');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication endpoints
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - password
 *               - full_name
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Phone number (10-15 digits)
 *               password:
 *                 type: string
 *                 minLength: 6
 *               full_name:
 *                 type: string
 *                 minLength: 2
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [owner, tenant]
 *                 default: tenant
 *                 description: User role
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Bad request
 */
router.post('/register', validateRegister, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone_or_email
 *               - password
 *             properties:
 *               phone_or_email:
 *                 type: string
 *                 description: Phone number or email address
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [owner, tenant]
 *                 description: User role (optional)
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials or role mismatch
 */
router.post('/login', validateLogin, login);

/**
 * @swagger
 * /api/auth/verify-phone:
 *   post:
 *     summary: Verify phone number with OTP
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - otp
 *             properties:
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Phone verified successfully
 *       400:
 *         description: Invalid OTP
 */
router.post('/verify-phone', auth, verifyPhone);

/**
 * @swagger
 * /api/auth/resend-otp:
 *   post:
 *     summary: Resend OTP for phone verification
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Bad request
 */
router.post('/resend-otp', auth, resendOTP);

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - current_password
 *               - new_password
 *             properties:
 *               current_password:
 *                 type: string
 *               new_password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid current password
 */
router.put('/change-password', auth, validateChangePassword, changePassword);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', auth, logout);

module.exports = router;