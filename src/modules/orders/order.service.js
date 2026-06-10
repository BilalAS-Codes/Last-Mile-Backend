const orderRepository = require('./order.repository');
const userRepository = require('../users/user.repository');
const walletRepository = require('../wallet/wallet.repository');
const db = require('../../config/db');
const csv = require('csv-parser');
const { Readable } = require('stream');
const { orderBodySchema } = require('./order.validation');
const zoneService = require('../zones/zone.service');

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

    // Automatically resolve zone_id based on pickup address coordinates
    let zone_id = orderData.zone_id || null;
    let pickup = orderData.pickup_address;
    if (typeof pickup === 'string') {
        try { pickup = JSON.parse(pickup); } catch(e) {}
    }
    if (!zone_id && pickup && pickup.lat && pickup.long) {
        const detectedZone = await zoneService.findZoneForCoordinates(parseFloat(pickup.lat), parseFloat(pickup.long));
        if (detectedZone) {
            zone_id = detectedZone.id;
        }
    }

    console.log(`[ORDER CREATION] Created order: tracking_id=${tracking_id}, coordinates=[lat=${pickup?.lat}, long=${pickup?.long}], resolved zone_id=${zone_id}`);

    return await orderRepository.create({ ...orderData, client_id, tracking_id, currency, delivery_fee, zone_id });
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

                // Automatically resolve zone_id based on pickup address coordinates
                let zone_id = rawOrderData.zone_id || null;
                if (!zone_id && rawOrderData.pickup_address && rawOrderData.pickup_address.lat && rawOrderData.pickup_address.long) {
                    const detectedZone = await zoneService.findZoneForCoordinates(rawOrderData.pickup_address.lat, rawOrderData.pickup_address.long);
                    if (detectedZone) {
                        zone_id = detectedZone.id;
                    }
                }
                rawOrderData.zone_id = zone_id;

                const { value: validatedData, error } = orderBodySchema.validate(rawOrderData);
                if (error) {
                    rowErrors.push(...error.details.map(d => d.message));
                }

                if (rowErrors.length === 0) {
                    const tracking_id = 'TRX' + Math.random().toString(36).substring(2, 10).toUpperCase();
                    console.log(`[ORDER CREATION] Created bulk order: tracking_id=${tracking_id}, coordinates=[lat=${rawOrderData.pickup_address.lat}, long=${rawOrderData.pickup_address.long}], resolved zone_id=${zone_id}`);
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

const triggerAssignmentNotifications = async (orderId, driverId) => {
    try {
        const order = await orderRepository.findById(orderId);
        const driver = await userRepository.findById(driverId);
        if (order && driver) {
            const { notifyDriverAssigned } = require('../notifications/driver/driver.notifications');
            const { notifyAdminOrderAssigned } = require('../notifications/admin/admin.notifications');
            const { notifyClientOrderAssigned } = require('../notifications/client/client.notifications');

            await Promise.all([
                notifyDriverAssigned(driverId, order.tracking_id),
                notifyAdminOrderAssigned(order.tracking_id, driver.name),
                notifyClientOrderAssigned(order.client_id, order.tracking_id, driver.name)
            ]);
        }
    } catch (e) {
        console.error('Failed to send order assignment notifications:', e);
    }
};

const triggerStatusNotifications = async (order, lowerStatus) => {
    try {
        if (!order || !order.driver_id) return;
        const driver = await userRepository.findById(order.driver_id);
        if (!driver) return;

        if (lowerStatus === 'picked-up' || lowerStatus === 'picked_up' || lowerStatus === 'in-transit') {
            const { notifyAdminOrderPickedUp } = require('../notifications/admin/admin.notifications');
            const { notifyClientOrderPickedUp } = require('../notifications/client/client.notifications');
            const { notifyDriverPickedUp } = require('../notifications/driver/driver.notifications');
            await Promise.all([
                notifyAdminOrderPickedUp(order.tracking_id, driver.name),
                notifyClientOrderPickedUp(order.client_id, order.tracking_id, driver.name),
                notifyDriverPickedUp(order.driver_id, order.tracking_id)
            ]);
        } else if (lowerStatus === 'delivered') {
            const { notifyAdminCodCollected } = require('../notifications/admin/admin.notifications');
            const { notifyClientCodCollected } = require('../notifications/client/client.notifications');
            const { notifyDriverDelivered } = require('../notifications/driver/driver.notifications');
            await Promise.all([
                notifyAdminCodCollected(order.tracking_id, driver.name, order.cod_amount, order.currency || 'SAR'),
                notifyClientCodCollected(order.client_id, order.tracking_id, order.cod_amount, order.currency || 'SAR'),
                notifyDriverDelivered(order.driver_id, order.tracking_id, order.cod_amount || 0, order.currency || 'SAR')
            ]);
        }
    } catch (e) {
        console.error('Failed to send status update notifications:', e);
    }
};

const assignDriver = async (orderId, driverId, adminId) => {
    const result = await orderRepository.update(orderId, {
        driver_id: driverId,
        status: 'assigned',
        assigned_by: adminId
    });
    await triggerAssignmentNotifications(orderId, driverId);
    return result;
};

const assignDriverWithTimeline = async (orderId, driverId, adminId) => {
    const order = await orderRepository.findById(orderId);
    const timelineEntry = { status: 'assigned', timestamp: new Date().toISOString() };

    let currentTimeline = [];
    if (order?.timeline) {
        if (typeof order.timeline === 'string') {
            try {
                currentTimeline = JSON.parse(order.timeline);
            } catch (e) {
                currentTimeline = [];
            }
        } else if (Array.isArray(order.timeline)) {
            currentTimeline = order.timeline;
        }
    }

    const updatedTimeline = [...currentTimeline, timelineEntry];
    const result = await orderRepository.update(orderId, {
        driver_id: driverId,
        status: 'assigned',
        assigned_by: adminId,
        timeline: JSON.stringify(updatedTimeline)
    });
    await triggerAssignmentNotifications(orderId, driverId);
    return result;
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
        await triggerStatusNotifications(updatedOrder, lowerStatus);
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
    assignDriverWithTimeline,
    updateStatus,
    markAsDelivered,
    cancelOrder
};
