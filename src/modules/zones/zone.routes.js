const express = require('express');
const router = express.Router();
const zoneController = require('./zone.controller');
const batchController = require('./batch.controller');
const { protect, authorize } = require('../../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Zones
 *   description: Zone management and driver-zone assignments
 */

/**
 * @swagger
 * /api/zones:
 *   post:
 *     summary: Create a new zone (Admin only)
 *     tags: [Zones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, coordinates]
 *             properties:
 *               name: { type: string, example: 'Riyadh East' }
 *               coordinates:
 *                 type: array
 *                 items:
 *                   type: array
 *                   items:
 *                     type: number
 *                 example: [[46.7, 24.7], [46.8, 24.7], [46.8, 24.8], [46.7, 24.8], [46.7, 24.7]]
 *     responses:
 *       201:
 *         description: Zone created successfully
 *       400:
 *         description: Invalid input or coordinates overlap
 */
router.post('/', protect, authorize('admin'), zoneController.createZone);

/**
 * @swagger
 * /api/zones:
 *   get:
 *     summary: Get all zones
 *     tags: [Zones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of zones
 */
router.get('/', protect, zoneController.getAllZones);

/**
 * @swagger
 * /api/zones/{id}:
 *   delete:
 *     summary: Delete a zone (Admin only)
 *     tags: [Zones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Zone deleted successfully
 *       404:
 *         description: Zone not found
 */
router.delete('/:id', protect, authorize('admin'), zoneController.deleteZone);

/**
 * @swagger
 * /api/zones/assign:
 *   post:
 *     summary: Assign a driver to single or multiple zones (Admin only)
 *     tags: [Zones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [driverId, zoneIds]
 *             properties:
 *               driverId: { type: string, format: uuid }
 *               zoneIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *                 example: ["uuid-zone-1", "uuid-zone-2"]
 *     responses:
 *       200:
 *         description: Driver assigned to zones successfully
 */
router.post('/assign', protect, authorize('admin'), zoneController.assignDriver);

/**
 * @swagger
 * /api/zones/driver/{driverId}:
 *   get:
 *     summary: Get zones assigned to a driver
 *     tags: [Zones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List of driver assigned zones
 */
router.get('/driver/:driverId', protect, zoneController.getDriverZones);

/**
 * @swagger
 * /api/zones/{id}:
 *   put:
 *     summary: Update a zone (Admin only)
 *     tags: [Zones]
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
 *               name: { type: string }
 *               coordinates:
 *                 type: array
 *                 items:
 *                   type: array
 *                   items:
 *                     type: number
 *     responses:
 *       200:
 *         description: Zone updated successfully
 *       400:
 *         description: Invalid coordinates or overlap
 */
router.put('/:id', protect, authorize('admin'), zoneController.updateZone);

// Order Batching / Clubbing Routes
router.post('/batches', protect, authorize('admin'), batchController.createManualBatch);
router.get('/batches/unassigned', protect, batchController.getUnassignedBatches);
router.post('/batches/:id/assign', protect, authorize('admin'), batchController.assignDriverToBatch);
router.post('/batches/auto-club', protect, authorize('admin'), batchController.triggerAutoClubbing);

module.exports = router;
