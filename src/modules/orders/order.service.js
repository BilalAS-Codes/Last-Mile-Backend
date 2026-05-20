const orderRepository = require('./order.repository');
const userRepository = require('../users/user.repository');
const walletRepository = require('../wallet/wallet.repository');
const db = require('../../config/db');
const csv = require('csv-parser');
const { Readable } = require('stream');
const { orderBodySchema } = require('./order.validation');

const createOrder = async (client_id, orderData) => {
    const tracking_id = 'TRX' + Math.random().toString(36).substring(2, 10).toUpperCase();

    // Fetch client to get their registered currency
    const clientUser = await userRepository.findById(client_id);
    const currency = clientUser?.currency || 'SAR';

    return await orderRepository.create({ ...orderData, client_id, tracking_id, currency });
};

const bulkCreateOrders = async (client_id, fileBuffer) => {
    const results = await new Promise((resolve, reject) => {
        const rows = [];
        Readable.from(fileBuffer)
            .pipe(csv())
            .on('data', (data) => rows.push(data))
            .on('end', () => resolve(rows))
            .on('error', (err) => reject(err));
    });

    if (results.length === 0) {
        const error = new Error('Bulk upload failed: CSV file is empty');
        error.statusCode = 400;
        throw error;
    }

    // Fetch client to get their registered currency
    const clientUser = await userRepository.findById(client_id);
    const currency = clientUser?.currency || 'SAR';

    const requiredHeaders = [
        'pickup_address', 'pickup_lat', 'pickup_long',
        'delivery_address', 'delivery_lat', 'delivery_long',
        'customer_name', 'customer_phone',
        'order_value', 'delivery_fee'
    ];

    const missingHeaders = requiredHeaders.filter(h => !Object.keys(results[0]).includes(h));
    if (missingHeaders.length > 0) {
        const error = new Error(`Bulk upload failed: Missing required CSV columns: ${missingHeaders.join(', ')}`);
        error.statusCode = 400;
        throw error;
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const createdOrders = [];
        const allErrors = [];

        for (let i = 0; i < results.length; i++) {
            const row = results[i];
            const rowErrors = [];

            // Check for missing values in row
            for (const header of requiredHeaders) {
                if (!row[header] || row[header].trim() === '') {
                    rowErrors.push(`Field '${header}' is missing`);
                }
            }

            if (rowErrors.length === 0) {
                const rawOrderData = {
                    pickup_address: {
                        address: row.pickup_address,
                        lat: parseFloat(row.pickup_lat),
                        long: parseFloat(row.pickup_long)
                    },
                    delivery_address: {
                        address: row.delivery_address,
                        lat: parseFloat(row.delivery_lat),
                        long: parseFloat(row.delivery_long)
                    },
                    customer_name: row.customer_name,
                    customer_phone: row.customer_phone,
                    order_value: parseFloat(row.order_value),
                    delivery_fee: parseFloat(row.delivery_fee),
                    currency: currency,
                    cod_amount: row.cod_amount ? parseFloat(row.cod_amount) : 0,
                    is_cod: parseFloat(row.cod_amount || 0) > 0
                };

                const { value: validatedData, error } = orderBodySchema.validate(rawOrderData);
                if (error) {
                    rowErrors.push(...error.details.map(d => d.message));
                }

                if (rowErrors.length === 0) {
                    const tracking_id = 'TRX' + Math.random().toString(36).substring(2, 10).toUpperCase();
                    const created = await orderRepository.create({ ...validatedData, client_id, tracking_id }, client);
                    createdOrders.push(created);
                }
            }

            if (rowErrors.length > 0) {
                allErrors.push({
                    row: i + 1,
                    tracking_id: row.tracking_id || 'N/A',
                    errors: rowErrors
                });
            }
        }

        if (allErrors.length > 0) {
            const error = new Error('Bulk upload failed with validation errors');
            error.statusCode = 400;
            error.details = allErrors;
            throw error;
        }

        await client.query('COMMIT');
        return {
            count: createdOrders.length,
            message: `Successfully created ${createdOrders.length} orders`
        };
    } catch (err) {
        await client.query('ROLLBACK');
        if (!err.statusCode) err.statusCode = 400;
        throw err;
    } finally {
        client.release();
    }
};

const getOrders = async (filters) => {
    return await orderRepository.findAll(filters);
};

const getDriverAssignments = async (driverId) => {
    return await orderRepository.findAllAssignedToDrivers(driverId);
};

const assignDriver = async (orderId, driverId, adminId) => {
    return await orderRepository.update(orderId, {
        driver_id: driverId,
        status: 'assigned',
        assigned_by: adminId
    });
};

const updateStatus = async (orderId, statusData) => {
    const { status, cod_collected } = statusData;
    if (!status) throw new Error('Status is required');

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const order = await orderRepository.findById(orderId);
        if (!order) throw new Error('Order not found');

        const lowerStatus = status.toLowerCase();
        const updatedOrder = await orderRepository.updateStatus(orderId, lowerStatus, cod_collected, client);

        // Update cash in hand if delivered and COD collected
        if (lowerStatus === 'delivered' && cod_collected === true) {
            // Check if this is a new delivery/collection to avoid double counting
            const alreadyProcessed = order.status.toLowerCase() === 'delivered' && order.cod_collected === true;

            if (!alreadyProcessed && order.driver_id) {
                // Using cod_amount as it represents the cash collected by the driver
                const updatedUser = await userRepository.incrementCashInHand(order.driver_id, order.cod_amount, client);

                // Record transaction
                await walletRepository.createTransaction({
                    driver_id: order.driver_id,
                    amount: order.cod_amount,
                    type: 'collection',
                    order_id: orderId,
                    balance_after: updatedUser.cash_in_hand
                }, client);
            }
        }

        await client.query('COMMIT');
        return updatedOrder;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

const markAsDelivered = async (orderId) => {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new Error('Order not found');

    const isCod = parseFloat(order.cod_amount || 0) > 0;
    const codCollected = isCod ? true : null;

    return await updateStatus(orderId, { status: 'delivered', cod_collected: codCollected });
};

const cancelOrder = async (orderId) => {
    const cancelled = await updateStatus(orderId, { status: 'cancelled' });
    return cancelled;
};

module.exports = {
    createOrder,
    bulkCreateOrders,
    getOrders,
    getDriverAssignments,
    assignDriver,
    updateStatus,
    markAsDelivered,
    cancelOrder
};
