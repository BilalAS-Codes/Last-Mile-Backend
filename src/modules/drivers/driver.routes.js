const express = require('express');
const router = express.Router();
const driverController = require('./driver.controller');
const validate = require('../../middleware/validate.middleware');
const { updateLocationSchema, getDriverLocationSchema, updateAssignmentStrategySchema } = require('./driver.validation');
const { protect, authorize } = require('../../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Drivers
 *   description: Driver tracking and management
 */

/**
 * @swagger
 * /api/drivers/location:
 *   post:
 *     summary: Update driver location
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               latitude: { type: number, example: 40.7128 }
 *               longitude: { type: number, example: -74.0060 }
 *     responses:
 *       200:
 *         description: Location updated
 */
router.post('/location', protect, authorize('driver'), validate(updateLocationSchema), driverController.updateLocation);

/**
 * @swagger
 * /api/drivers/locations:
 *   get:
 *     summary: Get latest locations of all drivers
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of latest locations
 */
router.get('/locations', protect, authorize('admin', 'client'), driverController.getLocations);

/**
 * @swagger
 * /api/drivers/{id}/location:
 *   get:
 *     summary: Get current location of a single driver
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The driver ID
 *     responses:
 *       200:
 *         description: Current location of the driver
 */
router.get('/:id/location', protect, authorize('admin', 'driver'), validate(getDriverLocationSchema), driverController.getDriverLocation);

/**
 * @swagger
 * /api/drivers/assignment-strategy:
 *   get:
 *     summary: Get current auto-assignment strategy
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current assignment strategy
 */
router.get('/assignment-strategy', protect, authorize('admin'), driverController.getAssignmentStrategy);

/**
 * @swagger
 * /api/drivers/assignment-strategy:
 *   post:
 *     summary: Update auto-assignment strategy
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - strategy
 *             properties:
 *               strategy: { type: string, enum: [fifo, nearest, zone], example: zone }
 *     responses:
 *       200:
 *         description: Strategy updated successfully
 */
router.post('/assignment-strategy', protect, authorize('admin'), validate(updateAssignmentStrategySchema), driverController.updateAssignmentStrategy);

module.exports = router;
