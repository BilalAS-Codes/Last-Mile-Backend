// get queues job using pgboss and asign to driver using 3 rules 
//1 . FIFO
//2.nearest driver using geohash and update the driver status to assigned 
//3.zone wise order assigned to driver 

const queueService = require('../queue/queue.service');
const db = require('../../config/db');
const { encodeGeohash } = require('./helpers/geohash');
const { getAvailableDrivers, rankAndSortDrivers, rankAndSortOrders } = require('./helpers/drivers');
const orderService = require('../orders/order.service');

// Map to track driver status from queue
const onlineDrivers = new Map(); // driverId -> { status: 'available' | 'assigned' | 'offline', lastSeen: Date.now() }

async function processAutoAssignment() {
    try {
        // 1. Get available driver IDs from the in-memory map populated by the drivers queue
        const availableDriverIds = Array.from(onlineDrivers.entries())
            .filter(([id, d]) => d.status === 'available')
            .map(([id]) => id);

        console.log('[DEBUG-AUTO-ASSIGN] All online drivers map:', Array.from(onlineDrivers.entries()));
        console.log('[DEBUG-AUTO-ASSIGN] Filtered available driver IDs:', availableDriverIds);

        if (availableDriverIds.length === 0) {
            console.log('Auto-assign skipped: No drivers are currently online/available.');
            return;
        }

        // 2. Resolve assignment strategy once
        const settings = require('../../config/assignment-config').getSettings();
        const strategy = settings?.strategy || 'fifo';
        console.log(`Auto-assigning using strategy: ${strategy}`);

        // 3. FIFO: Get all pending orders ordered by created_at ASC
        const pendingOrdersQuery = `
            SELECT id, tracking_id, pickup_address, delivery_address, created_at, status
            FROM orders
            WHERE UPPER(status) = 'PENDING'
            ORDER BY created_at ASC
        `;
        const pendingOrdersResult = await db.query(pendingOrdersQuery);
        const pendingOrders = pendingOrdersResult.rows;

        console.log(`[DEBUG-AUTO-ASSIGN] Found ${pendingOrders.length} pending orders:`, pendingOrders.map(o => ({ id: o.id, tracking_id: o.tracking_id })));

        if (pendingOrders.length === 0) {
            console.log('No pending orders to assign.');
            return;
        }

        for (const order of pendingOrders) {
            console.log(`[DEBUG-AUTO-ASSIGN] Processing assignment for order ${order.tracking_id} (${order.id})...`);
            // Parse pickup address
            let pickup = order.pickup_address;
            if (typeof pickup === 'string') {
                try {
                    pickup = JSON.parse(pickup);
                } catch (e) {
                    console.error('Error parsing pickup address:', e);
                    continue;
                }
            }

            if (!pickup || !pickup.lat || !pickup.long) {
                console.warn(`Order ${order.id} has invalid pickup coordinates.`);
                continue;
            }

            const orderLat = parseFloat(pickup.lat);
            const orderLong = parseFloat(pickup.long);
            const orderGeohash = encodeGeohash(orderLat, orderLong, 9);
            const orderZone = pickup.city || pickup.zip || '';
            console.log(`[DEBUG-AUTO-ASSIGN] Order pickup lat: ${orderLat}, long: ${orderLong}, geohash: ${orderGeohash}, zone: ${orderZone}`);

            // Get available drivers from users table matching the queue statuses
            const drivers = await getAvailableDrivers(db, availableDriverIds);
            console.log(`[DEBUG-AUTO-ASSIGN] DB returned ${drivers.length} drivers matching:`, drivers.map(d => ({ id: d.id, name: d.name, lat: d.latitude, long: d.longitude })));

            if (drivers.length === 0) {
                console.log(`No available drivers in database matching active queue status for order ${order.id}.`);
                continue;
            }

            // Rank drivers based on geohash prefix matching (nearest) and zone-wise matching
            const orderDetails = { orderLat, orderLong, orderGeohash, orderZone };
            const rankedDrivers = rankAndSortDrivers(drivers, orderDetails, strategy);

            const bestDriverMatch = rankedDrivers[0];
            if (bestDriverMatch) {
                const assignedDriver = bestDriverMatch.driver;
                console.log(`Assigning order ${order.id} to driver ${assignedDriver.name} (ID: ${assignedDriver.id})`);

                await orderService.assignDriverWithTimeline(order.id, assignedDriver.id, null);

                // Update driver/vehicle status queue or system update if necessary
                await queueService.publishJob('vehicle.status', {
                    jobId: assignedDriver.id,
                    type: 'assignment',
                    status: 'assigned',
                    orderId: order.id
                });

                // Remove assigned driver from the list of available IDs so they aren't assigned subsequent orders in this loop
                const index = availableDriverIds.indexOf(assignedDriver.id);
                if (index > -1) {
                    availableDriverIds.splice(index, 1);
                }
                onlineDrivers.set(assignedDriver.id, { status: 'assigned', lastSeen: Date.now() });
            }
        }
    } catch (e) {
        console.error('Error in processAutoAssignment:', e);
    }
}

async function processDriverAvailable(driverId) {
    try {
        console.log(`[EVENT-ASSIGN] Processing Driver Available for driverId: ${driverId}`);
        // Fetch driver from database using the same check to ensure they are available
        const drivers = await getAvailableDrivers(db, [driverId]);
        const driver = drivers[0];

        if (!driver) {
            console.log(`[EVENT-ASSIGN] Driver ${driverId} is not available in the database (may be offline, inactive, or already assigned).`);
            return;
        }

        // Get all pending orders
        const pendingOrdersQuery = `
            SELECT id, tracking_id, pickup_address, delivery_address, created_at, status
            FROM orders
            WHERE UPPER(status) = 'PENDING'
            ORDER BY created_at ASC
        `;
        const pendingOrdersResult = await db.query(pendingOrdersQuery);
        const pendingOrders = pendingOrdersResult.rows;

        if (pendingOrders.length === 0) {
            console.log('[EVENT-ASSIGN] No pending orders for available driver.');
            return;
        }

        // Resolve strategy
        const settings = require('../../config/assignment-config').getSettings();
        const strategy = settings?.strategy || 'fifo';
        console.log(`[EVENT-ASSIGN] Driver Available strategy: ${strategy}`);

        // Rank pending orders for this driver
        const rankedOrders = rankAndSortOrders(pendingOrders, driver, strategy);
        const bestOrderMatch = rankedOrders[0];

        if (bestOrderMatch) {
            const order = bestOrderMatch.order;
            console.log(`[EVENT-ASSIGN] Assigning order ${order.id} (tracking: ${order.tracking_id}) to driver ${driver.name} (ID: ${driver.id})`);

            await orderService.assignDriverWithTimeline(order.id, driver.id, null);

            await queueService.publishJob('vehicle.status', {
                jobId: driver.id,
                type: 'assignment',
                status: 'assigned',
                orderId: order.id
            });

            onlineDrivers.set(driver.id, { status: 'assigned', lastSeen: Date.now() });
        }
    } catch (e) {
        console.error('Error in processDriverAvailable:', e);
    }
}

async function processOrderCreated(orderId) {
    try {
        console.log(`[EVENT-ASSIGN] Processing Order Created for orderId: ${orderId}`);
        
        // Fetch the order
        const orderQuery = `
            SELECT id, tracking_id, pickup_address, delivery_address, created_at, status
            FROM orders
            WHERE id = $1 AND UPPER(status) = 'PENDING'
        `;
        const orderResult = await db.query(orderQuery, [orderId]);
        const order = orderResult.rows[0];

        if (!order) {
            console.log(`[EVENT-ASSIGN] Order ${orderId} not found or not in PENDING status.`);
            return;
        }

        // Parse pickup address
        let pickup = order.pickup_address;
        if (typeof pickup === 'string') {
            try {
                pickup = JSON.parse(pickup);
            } catch (e) {
                console.error('Error parsing pickup address:', e);
                return;
            }
        }

        if (!pickup || !pickup.lat || !pickup.long) {
            console.warn(`Order ${order.id} has invalid pickup coordinates.`);
            return;
        }

        const orderLat = parseFloat(pickup.lat);
        const orderLong = parseFloat(pickup.long);
        const orderGeohash = encodeGeohash(orderLat, orderLong, 9);
        const orderZone = pickup.city || pickup.zip || '';
        const orderDetails = { orderLat, orderLong, orderGeohash, orderZone };

        // Get available drivers from memory map
        const availableDriverIds = Array.from(onlineDrivers.entries())
            .filter(([id, d]) => d.status === 'available')
            .map(([id]) => id);

        if (availableDriverIds.length === 0) {
            console.log(`[EVENT-ASSIGN] No drivers are currently online/available for order ${order.id}.`);
            return;
        }

        // Fetch their details from DB
        const drivers = await getAvailableDrivers(db, availableDriverIds);
        if (drivers.length === 0) {
            console.log(`[EVENT-ASSIGN] No available drivers in database matching active queue status for order ${order.id}.`);
            return;
        }

        // Resolve strategy
        const settings = require('../../config/assignment-config').getSettings();
        const strategy = settings?.strategy || 'fifo';
        console.log(`[EVENT-ASSIGN] Order Created strategy: ${strategy}`);

        // Rank drivers
        const rankedDrivers = rankAndSortDrivers(drivers, orderDetails, strategy);
        const bestDriverMatch = rankedDrivers[0];

        if (bestDriverMatch) {
            const assignedDriver = bestDriverMatch.driver;
            console.log(`[EVENT-ASSIGN] Assigning order ${order.id} (tracking: ${order.tracking_id}) to driver ${assignedDriver.name} (ID: ${assignedDriver.id})`);

            await orderService.assignDriverWithTimeline(order.id, assignedDriver.id, null);

            await queueService.publishJob('vehicle.status', {
                jobId: assignedDriver.id,
                type: 'assignment',
                status: 'assigned',
                orderId: order.id
            });

            // Update in-memory map
            onlineDrivers.set(assignedDriver.id, { status: 'assigned', lastSeen: Date.now() });
        }
    } catch (e) {
        console.error('Error in processOrderCreated:', e);
    }
}

async function autoAssignDriver() {
    try {
        console.log('Registering vehicle status subscriber on vehicle.status queue...');
        await queueService.subscribeJob('vehicle.status', async (statusData) => {
            console.log('Received vehicle.status job:', statusData);
            const { jobId, type, status } = statusData;
            if (!jobId) return;

            let statusChanged = false;
            const current = onlineDrivers.get(jobId);

            if (type === 'online' || status === 'available') {
                if (!current || current.status !== 'available') {
                    onlineDrivers.set(jobId, { status: 'available', lastSeen: Date.now() });
                    statusChanged = true;
                }
            } else if (status === 'assigned' || type === 'offline' || status === 'offline') {
                const targetStatus = status || 'offline';
                if (!current || current.status !== targetStatus) {
                    onlineDrivers.set(jobId, { status: targetStatus, lastSeen: Date.now() });
                    statusChanged = true;
                }
            }

            // Trigger assignment checking automatically when a driver goes online/available
            if (statusChanged && onlineDrivers.get(jobId).status === 'available') {
                console.log(`Driver ${jobId} became available. Triggering auto-assignment check...`);
                await processDriverAvailable(jobId);
            }
        });

        console.log('Registering auto-assignment worker on order.created queue...');
        await queueService.subscribeJob('order.created', async (jobData) => {
            console.log('Received order.created job for auto-assignment. Running check...');
            if (jobData && jobData.id) {
                await processOrderCreated(jobData.id);
            } else {
                await processAutoAssignment();
            }
        });

        // Start a recurring interval check every 1 minute (60000 ms)
        console.log('Starting 30 sec recurring check for unassigned orders...');
        setInterval(async () => {
            console.log('Running scheduled 30 sec check for auto-assignment...');
            await processAutoAssignment();
        }, 30000);

        console.log('Auto-assign worker successfully started and listening.');
    } catch (error) {
        console.error('Error in autoAssignDriver:', error);
    }
}

module.exports = autoAssignDriver;