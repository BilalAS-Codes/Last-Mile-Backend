const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const validate = require('../../middleware/validate.middleware');
const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, verifyLoginOtpSchema, driverLoginSchema, verifyDriverLoginOtpSchema } = require('./auth.validation');
const { protect } = require('../../middleware/auth.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: admin@logiflow.com
 *         password:
 *           type: string
 *           format: password
 *           example: 123456
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *         - role
 *       properties:
 *         name:
 *           type: string
 *           example: John Doe
 *         email:
 *           type: string
 *           format: email
 *           example: john@example.com
 *         password:
 *           type: string
 *           format: password
 *           example: password123
 *         role:
 *           type: string
 *           enum: [admin, client, driver]
 *           example: client
 *         currency:
 *           type: string
 *           example: SAR
 *         vehicle_number:
 *           type: string
 *           example: ABC-1234
 *         vehicle_type:
 *           type: string
 *           example: Bike
 *         company_details:
 *           type: object
 *           properties:
 *             phone: { type: string, example: '555-0199' }
 *             companyName: { type: string, example: "Sarah's Boutique" }
 *             billingEmail: { type: string, format: email, example: 'billing@sarah.com' }
 *             feeType: { type: string, enum: [fixed, percentage], example: 'fixed' }
 *             feeValue: { type: number, example: 15 }
 *             includedDistance: { type: number, example: 15 } 
 *             extraDistanceFee: { type: number, example: 15 }  
 *             address:
 *               type: object
 *               properties:
 *                 zip: { type: string, example: '10001' }
 *                 city: { type: string, example: 'NYC' }
 *                 state: { type: string, example: 'NY' }
 *                 street: { type: string, example: '123 Fashion Ave' }
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input
 */
router.post('/register', validate(registerSchema), authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login an Admin or Client (Drivers not allowed)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *       403:
 *         description: Drivers are not allowed to access this portal
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', validate(loginSchema), authController.login);
router.post('/demo-login', validate(loginSchema), authController.demoLogin);

/**
 * @swagger
 * /api/auth/driver/login:
 *   post:
 *     summary: Login a Driver
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/driver/login', validate(driverLoginSchema), authController.driverLogin);
router.post('/driver/demo-login', validate(driverLoginSchema), authController.demoDriverLoginWithMock);
router.post('/driver/demo-verify-otp', validate(verifyDriverLoginOtpSchema), authController.verifyDriverLoginOtpDemo);

/**
 * @swagger
 * /api/auth/driver/verify-otp:
 *   post:
 *     summary: Verify 2-step verification login OTP for Driver
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - otp
 *             properties:
 *               phone: { type: string, example: '+1234567890' }
 *               otp: { type: string, example: '123456' }
 *     responses:
 *       200:
 *         description: Verification successful, returns access and refresh tokens
 *       401:
 *         description: Invalid or expired OTP
 */
router.post('/driver/verify-otp', validate(verifyDriverLoginOtpSchema), authController.verifyDriverLoginOtp);

/**
 * @swagger
 * /api/auth/verify-login-otp:
 *   post:
 *     summary: Verify 2-step verification login OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email: { type: string, format: email }
 *               otp: { type: string, example: '123456' }
 *     responses:
 *       200:
 *         description: Verification successful, returns access and refresh tokens
 *       401:
 *         description: Invalid or expired OTP
 */
router.post('/verify-login-otp', validate(verifyLoginOtpSchema), authController.verifyLoginOtp);


/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: OTP sent
 */
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string, format: email }
 *               otp: { type: string, example: '123456' }
 *               newPassword: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Password reset successful
 */
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user details
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User details retrieved
 *       401:
 *         description: Unauthorized
 */
router.get('/me', protect, authController.getMe);

/**
 * @swagger
 * /api/auth/driverme:
 *   get:
 *     summary: Get current driver profile including extra details
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Driver details retrieved
 *       401:
 *         description: Unauthorized
 *   put:
 *     summary: Update current driver profile extra details
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               profile_image: { type: string }
 *               vehicle_image: { type: string }
 *               plate_number: { type: string }
 *               license_number: { type: string }
 *               license_image: { type: string }
 *     responses:
 *       200:
 *         description: Driver details updated
 *       401:
 *         description: Unauthorized
 */
router.get('/driverme', protect, authController.getDriverMe);
router.put('/driverme', protect, authController.updateDriverMe);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: e7732a32...
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       400:
 *         description: Invalid token delivery channel (e.g. driver using cookie or admin not using cookie)
 *       401:
 *         description: Refresh token is missing, invalid, or expired
 */
router.post('/refresh', authController.refresh);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user and invalidate refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: e7732a32...
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', authController.logout);

module.exports = router;
