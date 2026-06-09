const batchRepository = require('./batch.repository');
const orderRepository = require('../orders/order.repository');
const orderService = require('../orders/order.service');
const db = require('../../config/db');
const { getDistance } = require('../driver-assignment/helpers/distance');

const CONFIG = {
    maxBatchSize: 5,
    maxPickupDistanceKm: 0.5, // 500m
    maxDeliveryDistanceKm: 2.0, // 2000m
    timeWindowMs: 60 * 60 * 1000 // 60 minutes
};

const generateBatchCode = () => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `BATCH-${dateStr}-${rand}`;
};

const createManualBatch = async (orderIds) => {
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        throw new Error('Order IDs must be an array of UUIDs');
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // Check if orders are valid and not already in a batch
        const orders = [];
        for (const orderId of orderIds) {
            const order = await orderRepository.findById(orderId);
            if (!order) {
                throw new Error(`Order ${orderId} not found`);
            }
            if (order.batch_id) {
                throw new Error(`Order ${order.tracking_id || orderId} is already assigned to a batch`);
            }
            if (order.status.toLowerCase() !== 'pending') {
                throw new Error(`Order ${order.tracking_id || orderId} is not in pending status`);
            }
            orders.push(order);
        }

        const batchCode = generateBatchCode();
        const batch = await batchRepository.createBatch({ batchCode }, client);

        for (const orderId of orderIds) {
            await batchRepository.linkOrderToBatch(orderId, batch.id, client);
        }

        const updatedBatch = await batchRepository.incrementTotalOrders(batch.id, orderIds.length, client);

        await client.query('COMMIT');
        return {
            batch: updatedBatch,
            orders
        };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

const getUnassignedBatches = async () => {
    const batches = await batchRepository.findUnassignedBatches();
    const result = [];
    for (const batch of batches) {
        const orders = await batchRepository.getOrdersForBatch(batch.id);
        result.push({
            ...batch,
            orders
        });
    }
    return result;
};

const assignDriverToBatch = async (batchId, driverId, adminId = null) => {
    const batch = await batchRepository.findById(batchId);
    if (!batch) throw new Error('Batch not found');
    if (batch.status === 'assigned') throw new Error('Batch is already assigned to a driver');

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // Assign driver to batch
        const updatedBatch = await batchRepository.assignDriver(batchId, driverId, client);

        // Fetch all orders in batch
        const orders = await batchRepository.getOrdersForBatch(batchId);

        // Assign driver to each order in the batch (and update timeline)
        for (const order of orders) {
            await orderService.assignDriverWithTimeline(order.id, driverId, adminId);
        }

        await client.query('COMMIT');
        return {
            batch: updatedBatch,
            orders
        };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

const autoClubOrders = async () => {
    // 1. Fetch all pending orders that are NOT in a batch and have a zone_id
    const query = `
        SELECT id, tracking_id, pickup_address, delivery_address, created_at, zone_id
        FROM orders
        WHERE UPPER(status) = 'PENDING' AND batch_id IS NULL AND zone_id IS NOT NULL
    `;
    const result = await db.query(query);
    const pendingOrders = result.rows;

    if (pendingOrders.length === 0) return [];

    // Parse addresses helper
    const parseAddress = (addr) => {
        if (typeof addr === 'string') {
            try { return JSON.parse(addr); } catch (e) { return {}; }
        }
        return addr || {};
    };

    // 2. Group by Zone ID
    const zonesMap = {};
    for (const order of pendingOrders) {
        order.pickup = parseAddress(order.pickup_address);
        order.delivery = parseAddress(order.delivery_address);
        order.createdTime = new Date(order.created_at).getTime();

        if (!zonesMap[order.zone_id]) {
            zonesMap[order.zone_id] = [];
        }
        zonesMap[order.zone_id].push(order);
    }

    const createdBatches = [];

    // 3. Run clustering algorithm within each Zone
    for (const zoneId of Object.keys(zonesMap)) {
        const zoneOrders = zonesMap[zoneId];
        const visited = new Set();

        for (let i = 0; i < zoneOrders.length; i++) {
            const o1 = zoneOrders[i];
            if (visited.has(o1.id)) continue;

            const currentCluster = [o1];
            visited.add(o1.id);

            for (let j = i + 1; j < zoneOrders.length; j++) {
                const o2 = zoneOrders[j];
                if (visited.has(o2.id)) continue;

                // Check distance criteria
                const pickupDist = getDistance(
                    parseFloat(o1.pickup.lat || 0), parseFloat(o1.pickup.long || 0),
                    parseFloat(o2.pickup.lat || 0), parseFloat(o2.pickup.long || 0)
                );
                const deliveryDist = getDistance(
                    parseFloat(o1.delivery.lat || 0), parseFloat(o1.delivery.long || 0),
                    parseFloat(o2.delivery.lat || 0), parseFloat(o2.delivery.long || 0)
                );
                
                // Check time window criteria
                const timeDiff = Math.abs(o1.createdTime - o2.createdTime);

                if (
                    pickupDist <= CONFIG.maxPickupDistanceKm &&
                    deliveryDist <= CONFIG.maxDeliveryDistanceKm &&
                    timeDiff <= CONFIG.timeWindowMs &&
                    currentCluster.length < CONFIG.maxBatchSize
                ) {
                    currentCluster.push(o2);
                    visited.add(o2.id);
                }
            }

            // If we found at least 2 orders to batch together
            if (currentCluster.length >= 2) {
                const client = await db.pool.connect();
                try {
                    await client.query('BEGIN');
                    const batchCode = generateBatchCode();
                    const batch = await batchRepository.createBatch({ batchCode }, client);

                    for (const order of currentCluster) {
                        await batchRepository.linkOrderToBatch(order.id, batch.id, client);
                    }

                    const updatedBatch = await batchRepository.incrementTotalOrders(batch.id, currentCluster.length, client);
                    await client.query('COMMIT');
                    createdBatches.push({
                        batch: updatedBatch,
                        orders: currentCluster
                    });
                } catch (err) {
                    await client.query('ROLLBACK');
                    console.error('Error auto-clubbing batch:', err);
                } finally {
                    client.release();
                }
            }
        }
    }

    return createdBatches;
};

module.exports = {
    createManualBatch,
    getUnassignedBatches,
    assignDriverToBatch,
    autoClubOrders
};
