const express = require('express');
const router = express.Router();
const billingController = require('./billing.controller');
const validate = require('../../middleware/validate.middleware');
const { generateInvoiceSchema, manualInvoiceSchema } = require('./billing.validation');
const { protect, authorize } = require('../../middleware/auth.middleware');


/**
 * @swagger
 * /api/billing:
 *   get:
 *     summary: List all invoices (Admin only)
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all invoices
 */
router.get('/', protect, authorize('admin'), billingController.listInvoices);

/**
 * @swagger
 * /api/billing/my-invoices:
 *   get:
 *     summary: Get invoices for the logged-in client
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of client's invoices
 */
router.get('/my-invoices', protect, authorize('client'), billingController.getMyInvoices);

/**
 * @swagger
 * /api/billing/client/{clientId}:
 *   get:
 *     summary: Get invoices for a specific client (Admin only)
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the client
 *     responses:
 *       200:
 *         description: List of client's invoices
 */
router.get('/client/:clientId', protect, authorize('admin'), billingController.getClientInvoices);

/**
 * @swagger
 * /api/billing/revenue-stats:
 *   get:
 *     summary: Get financial and revenue statistics (Admin only)
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Revenue and outstanding balance stats
 */
router.get('/revenue-stats', protect, authorize('admin'), billingController.getRevenueStats);

/**
 * @swagger
 * /api/billing/revenue-chart:
 *   get:
 *     summary: Get revenue performance data for charting (Admin only)
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Revenue performance chart data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { type: object }
 */
router.get('/revenue-chart', protect, authorize('admin'), billingController.getRevenueChartData);

/**
 * @swagger
 * /api/billing/uninvoiced-orders:
 *   get:
 *     summary: List all orders that are not yet invoiced
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by client ID (Optional for Admin)
 *     responses:
 *       200:
 *         description: List of uninvoiced orders
 */
router.get('/uninvoiced-orders', protect, authorize('admin', 'client'), billingController.getUninvoicedOrders);

/**
 * @swagger
 * /api/billing/generate:
 *   post:
 *     summary: Automatically generate invoice for all uninvoiced orders of a client
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [client_id, billing_period]
 *             properties:
 *               client_id: { type: string, format: uuid }
 *               billing_period: { type: string, example: 'May 2026' }
 *               due_date: { type: string, format: date-time }
 *     responses:
 *       201:
 *         description: Invoice created
 */
router.post('/generate', protect, authorize('admin'), validate(generateInvoiceSchema), billingController.generate);

/**
 * @swagger
 * /api/billing/create-manual:
 *   post:
 *     summary: Create invoice manually for selected orders with automated fee calculation
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderIds]
 *             properties:
 *               orderIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *               billing_period: { type: string, example: 'May 2026' }
 *               due_date: { type: string, format: date-time, example: '2026-05-30T12:00:00Z' }
 *               extra_charges: { type: number, example: 50.00, description: "Additional fees like handling or packaging" }
 *     responses:
 *       201:
 *         description: Invoice created
 */
router.post('/create-manual', protect, authorize('admin'), validate(manualInvoiceSchema), billingController.createManualInvoice);

/**
 * @swagger
 * /api/billing/{id}/paid:
 *   patch:
 *     summary: Mark an invoice as paid (Admin only)
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the invoice
 *     responses:
 *       200:
 *         description: Invoice marked as paid
 */
router.patch('/:id/paid', protect, authorize('admin'), billingController.markAsPaid);

module.exports = router;
