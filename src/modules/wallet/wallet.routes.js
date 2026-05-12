const express = require('express');
const router = express.Router();
const walletController = require('./wallet.controller');
const validate = require('../../middleware/validate.middleware');
const { settleFundsSchema, approveSettlementSchema } = require('./wallet.validation');
const { protect, authorize } = require('../../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Wallet
 *   description: Driver wallet and settlement operations
 */

/**
 * @swagger
 * /api/wallet/driver/{driverId}:
 *   get:
 *     summary: Get driver wallet details (cash in hand)
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Wallet details (including net cash, pending, and total collected)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     cash_in_hand: { type: number, description: 'Net available cash after deducting pending settlements' }
 *                     total_collected_balance: { type: number, description: 'Total cash collected from deliveries (including locked amount)' }
 *                     pending_settlement_balance: { type: number, description: 'Amount currently locked in pending settlement requests' }
 *                     total_cod_collected: { type: number, description: 'Lifetime total COD collected' }
 */
router.get('/driver/:driverId', protect, walletController.getDriverWallet);

/**
 * @swagger
 * /api/wallet/settle:
 *   post:
 *     summary: Initiate a settlement request (Driver only)
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: number, example: 100.00 }
 *     responses:
 *       201:
 *         description: Settlement initiated
 */
router.post('/settle', protect, authorize('driver'), validate(settleFundsSchema), walletController.settle);

/**
 * @swagger
 * /api/wallet/settlements:
 *   get:
 *     summary: List all settlements (Admin only)
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of settlements
 */
router.get('/settlements', protect, authorize('admin'), walletController.listSettlements);

/**
 * @swagger
 * /api/wallet/settlements/driver/{driverId}:
 *   get:
 *     summary: List all settlements for a specific driver (Admin or self)
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List of settlements for the driver
 */
router.get('/settlements/driver/:driverId', protect, walletController.getDriverSettlements);

/**
 * @swagger
 * /api/wallet/settlements/{id}:
 *   patch:
 *     summary: Approve or reject a settlement (Admin only)
 *     tags: [Wallet]
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
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [approved, rejected], example: 'approved' }
 *     responses:
 *       200:
 *         description: Settlement updated successfully
 */
router.patch('/settlements/:id', protect, authorize('admin'), validate(approveSettlementSchema), walletController.approve);

module.exports = router;
