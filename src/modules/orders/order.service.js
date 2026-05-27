const orderRepository = require('./order.repository');
const userRepository = require('../users/user.repository');
const walletRepository = require('../wallet/wallet.repository');
const db = require('../../config/db');
const csv = require('csv-parser');
const { Readable } = require('stream');
const { orderBodySchema } = require('./order.validation');

const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
    if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return 0;
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // in km
};

const getDistanceBasedDeliveryFee = (pickup, delivery, clientUser, baseFee = 0) => {
    if (!pickup || !delivery || !clientUser) return baseFee;
    const { lat: lat1, long: lon1 } = pickup;
    const { lat: lat2, long: lon2 } = delivery;
    if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return baseFee;

    const distance = calculateHaversineDistance(lat1, lon1, lat2, lon2);
    const includedDistance = clientUser.included_distance !== undefined && clientUser.included_distance !== null ? parseFloat(clientUser.included_distance) : 0;
    const extraDistanceFee = clientUser.extra_distance_fee !== undefined && clientUser.extra_distance_fee !== null ? parseFloat(clientUser.extra_distance_fee) : 0;

    let finalFee = parseFloat(baseFee) || 0;
    if (distance > includedDistance && extraDistanceFee > 0) {
        const extraDistance = distance - includedDistance;
        finalFee += extraDistance * extraDistanceFee;
    }
    return Math.round(finalFee * 100) / 100; // round to 2 decimal places
};

const createOrder = async (client_id, orderData) => {
    const tracking_id = 'TRX' + Math.random().toString(36).substring(2, 10).toUpperCase();
    console.log(orderData, 'order data')

    // Fetch client to get their registered currency
    const clientUser = await userRepository.findById(client_id);
    const currency = orderData?.currency || clientUser?.currency || 'SAR';

    let delivery_fee = orderData.delivery_fee || 0;
    if (clientUser) {
        delivery_fee = getDistanceBasedDeliveryFee(
            orderData.pickup_address,
            orderData.delivery_address,
            clientUser,
            delivery_fee
        );
    }

    return await orderRepository.create({ ...orderData, client_id, tracking_id, currency, delivery_fee });
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

                let delivery_fee = parseFloat(row.delivery_fee) || 0;
                if (clientUser) {
                    delivery_fee = getDistanceBasedDeliveryFee(
                        rawOrderData.pickup_address,
                        rawOrderData.delivery_address,
                        clientUser,
                        delivery_fee
                    );
                }
                rawOrderData.delivery_fee = delivery_fee;

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
