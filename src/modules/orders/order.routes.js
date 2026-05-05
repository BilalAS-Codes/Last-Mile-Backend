const express = require('express');
const router = express.Router();
const orderController = require('./order.controller');
const validate = require('../../middleware/validate.middleware');
const { createOrderSchema, assignDriverSchema, updateOrderStatusSchema } = require('./order.validation');
const { protect, authorize } = require('../../middleware/auth.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Address:
 *       type: object
 *       properties:
 *         street: { type: string, example: '123 Fashion Ave' }
 *         city: { type: string, example: 'New York' }
 *         state: { type: string, example: 'NY' }
 *         zip: { type: string, example: '10001' }
 *     CreateOrderRequest:
 *       type: object
 *       required: [tracking_id, pickup_address, delivery_address, customer_name, customer_phone]
 *       properties:
 *         tracking_id: { type: string, example: 'LF-98231' }
 *         pickup_address: { $ref: '#/components/schemas/Address' }
 *         delivery_address: { $ref: '#/components/schemas/Address' }
 *         customer_name: { type: string, example: 'Alice Johnson' }
 *         customer_phone: { type: string, example: '+1999888777' }
 *         order_value: { type: number, example: 1200 }
 *         cod_amount: { type: number, example: 1200 }
 *         delivery_fee: { type: number, example: 15 }
 */

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderRequest'
 *     responses:
 *       201:
 *         description: Order created successfully
 *   get:
 *     summary: Get all orders (Admin/Client/Driver)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of orders
 */
router.post('/', protect, authorize('Admin', 'Client'), validate(createOrderSchema), orderController.create);
router.get('/', protect, orderController.list);

/**
 * @swagger
 * /api/orders/driver/{driverId}:
 *   get:
 *     summary: Get driver assignments
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List of assigned orders
 */
router.get('/driver/:driverId', protect, orderController.getDriverAssignments);

/**
 * @swagger
 * /api/orders/{id}/assign:
 *   patch:
 *     summary: Assign driver to order (Admin only)
 *     tags: [Orders]
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
 *               driver_id: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Driver assigned
 */
router.patch('/:id/assign', protect, authorize('Admin'), validate(assignDriverSchema), orderController.assign);

/**
 * @swagger
 * /api/orders/{id}/status:
 *   patch:
 *     summary: Update order status (Admin/Driver)
 *     tags: [Orders]
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
 *               status: { type: string, example: 'IN_TRANSIT' }
 *               cod_collected: { type: boolean, example: true }
 *     responses:
 *       200:
 *         description: Order status updated
 */
router.patch('/:id/status', protect, authorize('Admin', 'Driver'), validate(updateOrderStatusSchema), orderController.updateStatus);

module.exports = router;
