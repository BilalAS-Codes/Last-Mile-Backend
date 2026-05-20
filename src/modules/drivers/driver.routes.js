const express = require('express');
const router = express.Router();
const driverController = require('./driver.controller');
const validate = require('../../middleware/validate.middleware');
const { updateLocationSchema } = require('./driver.validation');
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

module.exports = router;
