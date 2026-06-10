// get queues job using pgboss and asign to driver using 3 rules 
//1 . FIFO
//2.nearest driver using geohash and update the driver status to assigned 
//3.zone wise order assigned to driver 

const queueService = require('../queue/queue.service');
const db = require('../../config/db');
const { encodeGeohash } = require('./helpers/geohash');
const { getAvailableDrivers, rankAndSortDrivers, rankAndSortOrders } = require('./helpers/drivers');
const { getDistance } = require('./helpers/distance');
const orderService = require('../orders/order.service');

// Map to track driver status from queue
const onlineDrivers = new Map(); // driverId -> { status: 'available' | 'assigned' | 'offline', lastSeen: Date.now() }

// Helper function to check if a driver is eligible for a new order under the order clubbing rules
async function checkOrderClubbingEligibility(db, driverId, newOrder, settings) {
    const { order_clubbing, clubbing_distance, clubbing_time_difference } = settings;
    
    // Get active orders for this driver
    const activeOrdersQuery = `
        SELECT id, pickup_address, created_at
        FROM orders
        WHERE driver_id = $1
          AND UPPER(status) IN ('ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'PICKED-UP', 'IN-TRANSIT')
    `;
    const res = await db.query(activeOrdersQuery, [driverId]);
    const activeOrders = res.rows;

    if (activeOrders.length === 0) {
        // If driver has no active orders, they are fully available!
        return true;
    }

    if (!order_clubbing) {
        // If order clubbing is disabled and they have active orders, they are not eligible.
        return false;
    }

    // Parse new order's pickup coordinates
    let newPickup = newOrder.pickup_address;
    if (typeof newPickup === 'string') {
        try { newPickup = JSON.parse(newPickup); } catch(e) { return false; }
    }
    if (!newPickup || !newPickup.lat || !newPickup.long) return false;
    const newLat = parseFloat(newPickup.lat);
    const newLong = parseFloat(newPickup.long);
    const newTime = new Date(newOrder.created_at).getTime();

    // Check against ALL active orders of this driver
    for (const activeOrder of activeOrders) {
        let activePickup = activeOrder.pickup_address;
        if (typeof activePickup === 'string') {
            try { activePickup = JSON.parse(activePickup); } catch(e) { return false; }
        }
        if (!activePickup || !activePickup.lat || !activePickup.long) return false;
        
        // Calculate distance
        const dist = getDistance(
            newLat,
            newLong,
            parseFloat(activePickup.lat),
            parseFloat(activePickup.long)
        );

        // Calculate time difference in minutes
        const activeTime = new Date(activeOrder.created_at).getTime();
        const timeDiffMin = Math.abs(newTime - activeTime) / (1000 * 60);

        // Check distance condition if specified
        if (clubbing_distance !== undefined && clubbing_distance !== null) {
            if (dist > parseFloat(clubbing_distance)) {
                return false;
            }
        }

        // Check time condition if specified
        if (clubbing_time_difference !== undefined && clubbing_time_difference !== null) {
            if (timeDiffMin > parseFloat(clubbing_time_difference)) {
                return false;
            }
        }
    }

    return true;
}

async function processAutoAssignment() {
    try {
        // Resolve assignment settings once
        const settings = await require('../../config/assignment-config').getSettings();
        const strategy = settings?.strategy || 'fifo';
        const orderClubbing = settings?.order_clubbing || false;
        console.log(`[AUTO-ASSIGN STRATEGY] Selected strategy: ${strategy}, order clubbing: ${orderClubbing}`);

        // Get available driver IDs from the in-memory map
        const availableDriverIds = Array.from(onlineDrivers.entries())
            .filter(([id, d]) => d.status === 'available' || (orderClubbing && d.status === 'assigned'))
            .map(([id]) => id);

        console.log('[DEBUG-AUTO-ASSIGN] All online drivers map:', Array.from(onlineDrivers.entries()));
        console.log('[DEBUG-AUTO-ASSIGN] Filtered candidate driver IDs:', availableDriverIds);

        if (availableDriverIds.length === 0) {
            console.log('Auto-assign skipped: No drivers are currently online/available.');
            return;
        }

        // FIFO: Get all pending orders ordered by created_at ASC
        const pendingOrdersQuery = `
            SELECT id, tracking_id, pickup_address, delivery_address, created_at, status, zone_id
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
            console.log(`[DEBUG-AUTO-ASSIGN] Order pickup lat: ${orderLat}, long: ${orderLong}, geohash: ${orderGeohash}, zone: ${orderZone}, db_zone_id: ${order.zone_id}`);

            // Get available drivers from users table matching the queue statuses
            const targetZoneId = strategy === 'zone' ? order.zone_id : null;
            
            // If strategy is zone but order has no zone, skip or check next
            if (strategy === 'zone' && !targetZoneId) {
                console.log(`Order ${order.id} has no assigned zone. Skipping assignment under zone strategy.`);
                continue;
            }

            const drivers = await getAvailableDrivers(db, availableDriverIds, targetZoneId, orderClubbing);
            console.log(`[DEBUG-AUTO-ASSIGN] DB returned ${drivers.length} drivers matching:`, drivers.map(d => ({ id: d.id, name: d.name })));

            if (drivers.length === 0) {
                console.log(`No available drivers in database matching active queue status for order ${order.id} (Zone: ${targetZoneId}).`);
                continue;
            }

            // Filter drivers by clubbing eligibility
            const eligibleDrivers = [];
            for (const d of drivers) {
                const isEligible = await checkOrderClubbingEligibility(db, d.id, order, settings);
                if (isEligible) {
                    eligibleDrivers.push(d);
                }
            }

            if (eligibleDrivers.length === 0) {
                console.log(`No eligible drivers (order clubbing check failed) for order ${order.id}.`);
                continue;
            }

            // Rank drivers based on geohash prefix matching (nearest) and zone-wise matching
            const orderDetails = { orderLat, orderLong, orderGeohash, orderZone };
            const rankedDrivers = rankAndSortDrivers(eligibleDrivers, orderDetails, strategy);

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

                // Remove assigned driver from the list of available IDs so they aren't assigned subsequent orders in this loop if clubbing is disabled
                if (!orderClubbing) {
                    const index = availableDriverIds.indexOf(assignedDriver.id);
                    if (index > -1) {
                        availableDriverIds.splice(index, 1);
                    }
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
        const settings = await require('../../config/assignment-config').getSettings();
        const orderClubbing = settings?.order_clubbing || false;

        // Fetch driver from database
        const drivers = await getAvailableDrivers(db, [driverId], null, orderClubbing);
        const driver = drivers[0];

        if (!driver) {
            console.log(`[EVENT-ASSIGN] Driver ${driverId} is not available in the database (may be offline, inactive, or already assigned).`);
            return;
        }

        // Resolve strategy
        const strategy = settings?.strategy || 'fifo';
        console.log(`[EVENT-ASSIGN] Driver Available strategy: ${strategy}`);

        // Get pending orders (filtered by zone if strategy is zone)
        let pendingOrders = [];
        if (strategy === 'zone') {
            const driverZonesResult = await db.query(
                'SELECT zone_id FROM driver_zones WHERE driver_id = $1',
                [driverId]
            );
            const driverZoneIds = driverZonesResult.rows.map(r => r.zone_id);

            if (driverZoneIds.length === 0) {
                console.log(`[EVENT-ASSIGN] Driver ${driverId} is not assigned to any zones.`);
                return;
            }

            const pendingOrdersQuery = `
                SELECT id, tracking_id, pickup_address, delivery_address, created_at, status, zone_id
                FROM orders
                WHERE UPPER(status) = 'PENDING' AND zone_id = ANY($1::uuid[])
                ORDER BY created_at ASC
            `;
            const pendingOrdersResult = await db.query(pendingOrdersQuery, [driverZoneIds]);
            pendingOrders = pendingOrdersResult.rows;
        } else {
            const pendingOrdersQuery = `
                SELECT id, tracking_id, pickup_address, delivery_address, created_at, status, zone_id
                FROM orders
                WHERE UPPER(status) = 'PENDING'
                ORDER BY created_at ASC
            `;
            const pendingOrdersResult = await db.query(pendingOrdersQuery);
            pendingOrders = pendingOrdersResult.rows;
        }

        if (pendingOrders.length === 0) {
            console.log('[EVENT-ASSIGN] No pending orders for available driver in their assigned zones.');
            return;
        }

        // Rank pending orders for this driver
        const rankedOrders = rankAndSortOrders(pendingOrders, driver, strategy);
        
        // Filter by clubbing eligibility
        const eligibleOrders = [];
        for (const entry of rankedOrders) {
            const isEligible = await checkOrderClubbingEligibility(db, driverId, entry.order, settings);
            if (isEligible) {
                eligibleOrders.push(entry);
            }
        }

        const bestOrderMatch = eligibleOrders[0];

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
            SELECT id, tracking_id, pickup_address, delivery_address, created_at, status, zone_id
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

        // Resolve strategy
        const settings = await require('../../config/assignment-config').getSettings();
        const strategy = settings?.strategy || 'fifo';
        const orderClubbing = settings?.order_clubbing || false;
        console.log(`[EVENT-ASSIGN] Order Created strategy: ${strategy}, order clubbing: ${orderClubbing}`);

        // Get available drivers from memory map
        const availableDriverIds = Array.from(onlineDrivers.entries())
            .filter(([id, d]) => d.status === 'available' || (orderClubbing && d.status === 'assigned'))
            .map(([id]) => id);

        if (availableDriverIds.length === 0) {
            console.log(`[EVENT-ASSIGN] No drivers are currently online/available for order ${order.id}.`);
            return;
        }

        // Fetch their details from DB
        const targetZoneId = strategy === 'zone' ? order.zone_id : null;
        if (strategy === 'zone' && !targetZoneId) {
            console.log(`[EVENT-ASSIGN] Order ${order.id} has no assigned zone. Skipping assignment under zone strategy.`);
            return;
        }

        const drivers = await getAvailableDrivers(db, availableDriverIds, targetZoneId, orderClubbing);
        if (drivers.length === 0) {
            console.log(`[EVENT-ASSIGN] No available drivers in database matching active queue status for order ${order.id} (Zone: ${targetZoneId}).`);
            return;
        }

        // Filter drivers by clubbing eligibility
        const eligibleDrivers = [];
        for (const d of drivers) {
            const isEligible = await checkOrderClubbingEligibility(db, d.id, order, settings);
            if (isEligible) {
                eligibleDrivers.push(d);
            }
        }

        if (eligibleDrivers.length === 0) {
            console.log(`[EVENT-ASSIGN] No eligible drivers (order clubbing check failed) for order ${order.id}.`);
            return;
        }

        // Rank drivers
        const rankedDrivers = rankAndSortDrivers(eligibleDrivers, orderDetails, strategy);
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

            // Trigger assignment checking automatically when a driver is available/online
            if (onlineDrivers.get(jobId) && onlineDrivers.get(jobId).status === 'available') {
                console.log(`Driver ${jobId} is available. Triggering auto-assignment check...`);
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


        console.log('Auto-assign worker successfully started and listening.');
    } catch (error) {
        console.error('Error in autoAssignDriver:', error);
    }
}

module.exports = autoAssignDriver;