const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const validate = require('../../middleware/validate.middleware');
const { updateDriverStatusSchema, updateUserSchema, deleteUserSchema } = require('./user.validation');
const { protect, authorize } = require('../../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List all users (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/', protect, authorize('Admin'), userController.listUsers);

/**
 * @swagger
 * /api/users/drivers:
 *   get:
 *     summary: List active drivers
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of drivers
 */
router.get('/drivers', protect, userController.listDrivers);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user details (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: 'John Doe' }
 *               email: { type: string, format: email, example: 'john@example.com' }
 *               phone: { type: string, example: '+919876543210' }
 *               role: { type: string, enum: [admin, client, driver], example: 'driver' }
 *               active: { type: boolean, example: true }
 *               vehicle_number: { type: string, example: 'ABC-1234' }
 *               vehicle_type: { type: string, example: 'Bike' }
 *     responses:
 *       200:
 *         description: User updated
 */
router.put('/:id', protect, authorize('Admin'), validate(updateUserSchema), userController.update);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User deleted
 */
router.delete('/:id', protect, authorize('Admin'), validate(deleteUserSchema), userController.delete);

/**
 * @swagger
 * /api/users/drivers/{id}/status:
 *   put:
 *     summary: Update driver active status
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               is_active: { type: boolean }
 *     responses:
 *       200:
 *         description: Status updated
 */
router.put('/drivers/:id/status', protect, authorize('Admin', 'Driver'), validate(updateDriverStatusSchema), userController.updateDriverStatus);

module.exports = router;
