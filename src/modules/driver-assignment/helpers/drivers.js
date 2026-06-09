const { encodeGeohash, getCommonPrefixLength } = require('./geohash');
const { getDistance } = require('./distance');

/**
 * Fetch available drivers that are online and not currently assigned to active orders.
 */
async function getAvailableDrivers(db, availableDriverIds, zoneId = null) {
    let availableDriversQuery = `
        SELECT u.id, u.name, u.company_details, dl.latitude, dl.longitude
        FROM users u
        LEFT JOIN driver_locations dl ON u.id = dl.driver_id
        WHERE LOWER(u.role) = 'driver'
          AND u.active = true
          AND u.id = ANY($1::uuid[])
          AND u.id NOT IN (
              SELECT DISTINCT driver_id 
              FROM orders 
              WHERE driver_id IS NOT NULL 
                AND UPPER(status) IN ('ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'PICKED-UP', 'IN-TRANSIT')
          )
    `;
    const params = [availableDriverIds];
    if (zoneId) {
        availableDriversQuery += ` AND u.id IN (SELECT driver_id FROM driver_zones WHERE zone_id = $2) `;
        params.push(zoneId);
    }
    console.log('[DEBUG-AUTO-ASSIGN] Querying DB for drivers with IDs:', availableDriverIds, 'Zone:', zoneId);
    const driversResult = await db.query(availableDriversQuery, params);
    return driversResult.rows;
}

/**
 * Rank and sort available drivers based on distance, geohash precision, zone match, and strategy.
 */
function rankAndSortDrivers(drivers, orderDetails, strategy) {
    const { orderLat, orderLong, orderGeohash, orderZone } = orderDetails;

    const rankedDrivers = drivers.map(driver => {
        const driverLat = parseFloat(driver.latitude || orderLat);
        const driverLong = parseFloat(driver.longitude || orderLong);
        const driverGeohash = encodeGeohash(driverLat, driverLong, 9);

        // Calculate common geohash prefix length (higher is closer)
        const geohashPrefixLen = getCommonPrefixLength(orderGeohash, driverGeohash);

        // Check zone matching (exact city/zip match or high geohash similarity >= 4 chars)
        let driverDetails = driver.company_details;
        if (typeof driverDetails === 'string') {
            try {
                driverDetails = JSON.parse(driverDetails);
            } catch (e) {
                // Ignore parsing errors
            }
        }
        const driverZone = driverDetails?.address?.city || driverDetails?.address?.zip || '';
        
        const isZoneMatch = (orderZone && driverZone && orderZone.toLowerCase() === driverZone.toLowerCase()) || (geohashPrefixLen >= 4);

        const distance = getDistance(orderLat, orderLong, driverLat, driverLong);

        console.log(`[DEBUG-AUTO-ASSIGN] Driver ${driver.name} details -> Lat: ${driverLat}, Long: ${driverLong}, Geohash: ${driverGeohash}, CommonPrefix: ${geohashPrefixLen}, ZoneMatch: ${isZoneMatch}, Distance: ${distance.toFixed(2)} km`);

        return {
            driver,
            geohashPrefixLen,
            isZoneMatch,
            distance
        };
    });

    if (strategy === 'fifo') {
        // FIFO strategy: Assign to any available driver directly (preserve original db selection query order)
    } else if (strategy === 'nearest') {
        // Nearest driver strategy: Sort strictly by geohash matching precision and distance
        rankedDrivers.sort((a, b) => {
            if (b.geohashPrefixLen !== a.geohashPrefixLen) {
                return b.geohashPrefixLen - a.geohashPrefixLen;
            }
            return a.distance - b.distance;
        });
    } else {
        // Zone-wise driver strategy: Prioritize zone compatibility first, then spatial geohash prefix precision
        rankedDrivers.sort((a, b) => {
            if (a.isZoneMatch && !b.isZoneMatch) return -1;
            if (!a.isZoneMatch && b.isZoneMatch) return 1;
            if (b.geohashPrefixLen !== a.geohashPrefixLen) {
                return b.geohashPrefixLen - a.geohashPrefixLen;
            }
            return a.distance - b.distance;
        });
    }

    return rankedDrivers;
}

function rankAndSortOrders(orders, driver, strategy) {
    const driverLat = parseFloat(driver.latitude);
    const driverLong = parseFloat(driver.longitude);
    const driverGeohash = encodeGeohash(driverLat, driverLong, 9);
    let driverDetails = driver.company_details;
    if (typeof driverDetails === 'string') {
        try {
            driverDetails = JSON.parse(driverDetails);
        } catch (e) {
            // Ignore parsing errors
        }
    }
    const driverZone = driverDetails?.address?.city || driverDetails?.address?.zip || '';

    const rankedOrders = orders.map(order => {
        let pickup = order.pickup_address;
        if (typeof pickup === 'string') {
            try {
                pickup = JSON.parse(pickup);
            } catch (e) {
                // Ignore parsing errors
            }
        }
        const orderLat = parseFloat(pickup?.lat || 0);
        const orderLong = parseFloat(pickup?.long || 0);
        const orderGeohash = encodeGeohash(orderLat, orderLong, 9);
        const orderZone = pickup?.city || pickup?.zip || '';

        const geohashPrefixLen = getCommonPrefixLength(orderGeohash, driverGeohash);
        const isZoneMatch = (orderZone && driverZone && orderZone.toLowerCase() === driverZone.toLowerCase()) || (geohashPrefixLen >= 4);
        const distance = getDistance(orderLat, orderLong, driverLat, driverLong);

        return {
            order,
            geohashPrefixLen,
            isZoneMatch,
            distance,
            created_at: new Date(order.created_at).getTime()
        };
    });

    if (strategy === 'fifo') {
        rankedOrders.sort((a, b) => a.created_at - b.created_at);
    } else if (strategy === 'nearest') {
        rankedOrders.sort((a, b) => {
            if (b.geohashPrefixLen !== a.geohashPrefixLen) {
                return b.geohashPrefixLen - a.geohashPrefixLen;
            }
            return a.distance - b.distance;
        });
    } else {
        rankedOrders.sort((a, b) => {
            if (a.isZoneMatch && !b.isZoneMatch) return -1;
            if (!a.isZoneMatch && b.isZoneMatch) return 1;
            if (b.geohashPrefixLen !== a.geohashPrefixLen) {
                return b.geohashPrefixLen - a.geohashPrefixLen;
            }
            return a.distance - b.distance;
        });
    }

    return rankedOrders;
}

module.exports = {
    getAvailableDrivers,
    rankAndSortDrivers,
    rankAndSortOrders
};

