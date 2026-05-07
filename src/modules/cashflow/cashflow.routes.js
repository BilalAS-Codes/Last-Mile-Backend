const express = require('express');
const router = express.Router();
const cashflowController = require('./cashflow.controller');
const { protect, authorize } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const { approveSettlementSchema } = require('./cashflow.validation');

/**
 * @swagger
 * tags:
 *   name: Cashflow
 *   description: Administrative cash flow and settlement management
 */

/**
 * @swagger
 * /api/cashflow/stats:
 *   get:
 *     summary: Get administrative cash flow statistics
 *     tags: [Cashflow]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cash flow statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalCashWithDrivers: { type: number, example: 1250.50 }
 *                     consolidatedToday: { type: number, example: 450.00 }
 *                     pendingConsolidation: { type: number, example: 200.00 }
 */
router.get('/stats', protect, authorize('admin'), cashflowController.getStats);

/**
 * @swagger
 * /api/cashflow/settlements:
 *   get:
 *     summary: Get settlement history for all drivers
 *     tags: [Cashflow]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of settlements
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       amount: { type: number }
 *                       status: { type: string, example: 'Approved' }
 *                       created_at: { type: string, format: date-time }
 *                       driver_name: { type: string }
 *                       driver_email: { type: string }
 *                       admin_name: { type: string }
 */
router.get('/settlements', protect, authorize('admin'), cashflowController.getSettlements);

/**
 * @swagger
 * /api/cashflow/settlements/driver/{driverId}:
 *   get:
 *     summary: Get settlement history for a specific driver
 *     tags: [Cashflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Driver ID
 *     responses:
 *       200:
 *         description: List of driver's settlements
 */
router.get('/settlements/driver/:driverId', protect, authorize('admin'), cashflowController.getDriverSettlements);

/**
 * @swagger
 * /api/cashflow/settlements/{id}/approve:
 *   post:
 *     summary: Approve a driver settlement (Admin only)
 *     description: Marks the settlement as Approved and atomically deducts the amount from the driver's cash_in_hand balance.
 *     tags: [Cashflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Settlement ID
 *     responses:
 *       200:
 *         description: Settlement approved successfully
 */
router.post('/settlements/:id/approve', protect, authorize('admin'), validate(approveSettlementSchema), cashflowController.approveSettlement);

/**
 * @swagger
 * /api/cashflow/settle-driver:
 *   post:
 *     summary: Directly settle a driver's cash in hand (Admin only)
 *     description: Creates an approved settlement and deducts the amount from the driver's cash balance in one go.
 *     tags: [Cashflow]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [driverId, amount]
 *             properties:
 *               driverId: { type: string, format: uuid }
 *               amount: { type: number, example: 50.00 }
 *     responses:
 *       201:
 *         description: Settlement processed successfully
 */
router.post('/settle-driver', protect, authorize('admin'), cashflowController.directSettlement);

module.exports = router;
