const orderRepository = require('./order.repository');
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
        return await orderRepository.findAll({ driver_id: driverId, status: 'Assigned' });
    }

    async assignDriver(orderId, driverId) {
        return await orderRepository.update(orderId, { driver_id: driverId, status: 'Assigned' });
    }

    async updateStatus(orderId, statusData) {
        return await orderRepository.update(orderId, statusData);
    }
}

module.exports = new OrderService();
