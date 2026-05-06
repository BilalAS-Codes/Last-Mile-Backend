const orderRepository = require('./order.repository');
const userRepository = require('../users/user.repository');
const db = require('../../config/db');
const csv = require('csv-parser');
const { Readable } = require('stream');
const { orderBodySchema } = require('./order.validation');

class OrderService {
    async createOrder(client_id, orderData) {
        const tracking_id = 'TRX' + Math.random().toString(36).substring(2, 10).toUpperCase();
        return await orderRepository.create({ ...orderData, client_id, tracking_id });
    }

    async bulkCreateOrders(client_id, fileBuffer) {
        const results = [];

        return new Promise((resolve, reject) => {
            const stream = Readable.from(fileBuffer);
            stream.pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', async () => {
                    try {
                        const createdOrders = [];
                        const errors = [];
                        for (let i = 0; i < results.length; i++) {
                            const row = results[i];
                            try {
                                // Extract and transform data from CSV row
                                let rawOrderData = {
                                    pickup_address: {
                                        address: row.pickup_address,
                                        lat: row.pickup_lat ? parseFloat(row.pickup_lat) : undefined,
                                        long: row.pickup_long ? parseFloat(row.pickup_long) : undefined
                                    },
                                    delivery_address: {
                                        address: row.delivery_address,
                                        lat: row.delivery_lat ? parseFloat(row.delivery_lat) : undefined,
                                        long: row.delivery_long ? parseFloat(row.delivery_long) : undefined
                                    },
                                    customer_name: row.customer_name,
                                    customer_phone: row.customer_phone,
                                    cod_amount: row.cod_amount ? parseFloat(row.cod_amount) : 0,
                                    is_cod: parseFloat(row.cod_amount || 0) > 0
                                };

                                // Validate and strip unknown fields
                                const { value: validatedData, error } = orderBodySchema.validate(rawOrderData);

                                if (error) {
                                    throw new Error(`Validation failed: ${error.message}`);
                                }

                                const created = await this.createOrder(client_id, validatedData);
                                createdOrders.push({
                                    id: created.id,
                                    tracking_id: created.tracking_id
                                });
                            } catch (err) {
                                errors.push({ index: i + 1, error: err.message });
                            }
                        }
                        resolve({
                            count: createdOrders.length,
                            orders: createdOrders,
                            errors: errors.length > 0 ? errors : undefined
                        });
                    } catch (err) {
                        reject(err);
                    }
                })
                .on('error', (err) => reject(err));
        });
    }

    async getOrders(filters) {
        return await orderRepository.findAll(filters);
    }

    async getDriverAssignments(driverId) {
        return await orderRepository.findAll({ driver_id: driverId, status: 'assigned' });
    }

    async assignDriver(orderId, driverId) {
        return await orderRepository.update(orderId, { driver_id: driverId, status: 'assigned' });
    }

    async updateStatus(orderId, statusData) {
        const { status, cod_collected } = statusData;
        if (!status) throw new Error('Status is required');

        return await orderRepository.updateStatus(orderId, status.toLowerCase(), cod_collected);
    }

    async markAsDelivered(orderId) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            const order = await orderRepository.findById(orderId);
            if (!order) throw new Error('Order not found');

            const isCod = parseFloat(order.cod_amount || 0) > 0;
            const codCollected = isCod ? true : null;

            // 1. Update order status
            const updatedOrder = await orderRepository.updateStatus(orderId, 'delivered', codCollected, client);

            // 2. If COD, add to driver's cash_in_hand
            if (isCod && order.driver_id) {
                await userRepository.incrementCashInHand(order.driver_id, order.cod_amount, client);
            }

            await client.query('COMMIT');
            return updatedOrder;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }
}

module.exports = new OrderService();
