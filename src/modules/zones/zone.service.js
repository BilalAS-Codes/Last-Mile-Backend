const zoneRepository = require('./zone.repository');
const turf = require('@turf/turf');
const db = require('../../config/db');

// Helper to ensure polygon coordinates are closed (first and last elements are the same)
const closePolygon = (coords) => {
    if (!coords || coords.length === 0) return [];
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
        return [...coords, [first[0], first[1]]];
    }
    return coords;
};

/**
 * Check if two polygons overlap or intersect.
 */
const doesOverlap = (coordsA, coordsB) => {
    try {
        const polyA = turf.polygon([closePolygon(coordsA)]);
        const polyB = turf.polygon([closePolygon(coordsB)]);

        // 1. Check if they overlap
        if (turf.booleanOverlap(polyA, polyB)) {
            return true;
        }

        // 2. Check if one is completely inside the other
        // Turf booleanWithin / booleanContains
        if (turf.booleanWithin(polyA, polyB) || turf.booleanWithin(polyB, polyA)) {
            return true;
        }

        // 3. Check if they intersect (have any overlapping area)
        // In @turf/turf v6/v7, turf.intersect takes a feature collection or two features depending on version.
        // We can check intersection by passing them directly.
        const intersection = turf.intersect(turf.featureCollection([polyA, polyB]));
        if (intersection) {
            return true;
        }
    } catch (e) {
        console.error('Error comparing polygons:', e);
    }
    return false;
};

/**
 * Check if a coordinate [longitude, latitude] falls inside a polygon's boundaries.
 */
const isPointInZone = (lng, lat, coordinates) => {
    try {
        const pt = turf.point([lng, lat]);
        const poly = turf.polygon([closePolygon(coordinates)]);
        return turf.booleanPointInPolygon(pt, poly);
    } catch (e) {
        console.error('Error running point-in-polygon check:', e);
        return false;
    }
};

const createZone = async ({ name, coordinates }) => {
    if (!name) throw new Error('Zone name is required');
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 3) {
        throw new Error('Coordinates must be an array representing a polygon with at least 3 points');
    }

    // Retrieve all existing zones
    const existingZones = await zoneRepository.findAll();

    // Check for overlap with any existing zone
    for (const zone of existingZones) {
        let existingCoords = zone.coordinates;
        if (typeof existingCoords === 'string') {
            existingCoords = JSON.parse(existingCoords);
        }
        if (doesOverlap(coordinates, existingCoords)) {
            throw new Error(`Zone coordinates overlap with existing zone: "${zone.name}"`);
        }
    }

    return await zoneRepository.create({ name, coordinates });
};

const getAllZones = async () => {
    const zones = await zoneRepository.findAll();
    return zones.map(z => {
        if (typeof z.coordinates === 'string') {
            z.coordinates = JSON.parse(z.coordinates);
        }
        console.log(`[ZONE] Zone "${z.name}" coordinates:`, JSON.stringify(z.coordinates));
        return z;
    });
};

const deleteZone = async (id) => {
    return await zoneRepository.deleteZone(id);
};

const assignDriverToZones = async (driverId, zoneIds) => {
    if (!driverId) throw new Error('Driver ID is required');
    if (!Array.isArray(zoneIds)) throw new Error('Zone IDs must be an array');

    if (zoneIds.length > 1) {
        throw new Error('A driver can only be assigned to one zone at a time');
    }

    // Get current zones for the driver
    const existingZones = await zoneRepository.findZonesByDriverId(driverId);

    if (zoneIds.length === 0) {
        // Clear all assignments (removal)
        await zoneRepository.removeAllDriverAssignments(driverId);
        return [];
    }

    const targetZoneId = zoneIds[0];

    if (existingZones.length > 0) {
        const currentZone = existingZones[0];
        if (currentZone.id !== targetZoneId) {
            throw new Error(`Driver is already assigned to zone "${currentZone.name}". Remove them from "${currentZone.name}" first.`);
        }
        return existingZones;
    }

    const assignment = await zoneRepository.assignDriver(driverId, targetZoneId);
    try {
        if (assignment) {
            const userRepository = require('../users/user.repository');
            const driver = await userRepository.findById(driverId);
            const zone = await zoneRepository.findById(targetZoneId);
            if (driver && zone) {
                const { notifyDriverZoneAssigned } = require('../notifications/driver/driver.notifications');
                const { notifyAdminZoneAssigned } = require('../notifications/admin/admin.notifications');
                await Promise.all([
                    notifyDriverZoneAssigned(driverId, targetZoneId, zone.name),
                    notifyAdminZoneAssigned(driver.name, zone.name)
                ]);
            }
        }
    } catch (e) {
        console.error('Failed to trigger zone assignment notifications:', e);
    }
    return assignment ? [assignment] : [];
};

const assignDriverToZonesWithAvailability = async (driverId, zoneIds) => {
    if (!driverId) throw new Error('Driver ID is required');
    if (!Array.isArray(zoneIds)) throw new Error('Zone IDs must be an array');

    if (zoneIds.length > 1) {
        throw new Error('A driver can only be assigned to one zone at a time');
    }

    const targetZoneId = zoneIds[0];

    // Get current zones for the driver
    const existingZones = await zoneRepository.findZonesByDriverId(driverId);
    console.log(`[ZONE-ASSIGN-CHECK] Reassign request for driverId: ${driverId}, targetZoneId: ${targetZoneId}`);
    console.log(`[ZONE-ASSIGN-CHECK] Existing zones for driver:`, existingZones.map(z => ({ id: z.id, name: z.name })));

    // Query active orders first
    const activeOrdersQuery = `
        SELECT id, tracking_id, status 
        FROM orders 
        WHERE driver_id = $1 
          AND UPPER(status) IN ('ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'PICKED-UP', 'IN-TRANSIT')
    `;
    const activeRes = await db.query(activeOrdersQuery, [driverId]);
    console.log(`[ZONE-ASSIGN-CHECK] Active orders query returned rows:`, activeRes.rows);

    if (zoneIds.length === 0) {
        if (activeRes.rowCount > 0) {
            throw new Error(`Driver is busy with orders. Once driver is available, you can change the zone.`);
        }
        // Clear all assignments (removal)
        await zoneRepository.removeAllDriverAssignments(driverId);
        return [];
    }

    if (existingZones.length > 0) {
        const currentZone = existingZones[0];
        if (currentZone.id !== targetZoneId) {
            if (activeRes.rowCount > 0) {
                throw new Error(`Driver is busy with orders. Once driver is available, you can change the zone.`);
            }
            // If they are available (no active orders), remove them from the old zone first
            await zoneRepository.removeAllDriverAssignments(driverId);
        } else {
            console.log(`[ZONE-ASSIGN-CHECK] Driver is already assigned to the target zone. No change needed.`);
            return existingZones;
        }
    } else {
        // No existing zones, but trying to assign a zone
        if (activeRes.rowCount > 0) {
            throw new Error(`Driver is busy with orders. Once driver is available, you can change the zone.`);
        }
    }

    const assignment = await zoneRepository.assignDriver(driverId, targetZoneId);
    try {
        if (assignment) {
            const userRepository = require('../users/user.repository');
            const driver = await userRepository.findById(driverId);
            const zone = await zoneRepository.findById(targetZoneId);
            if (driver && zone) {
                const { notifyDriverZoneAssigned } = require('../notifications/driver/driver.notifications');
                const { notifyAdminZoneAssigned } = require('../notifications/admin/admin.notifications');
                await Promise.all([
                    notifyDriverZoneAssigned(driverId, targetZoneId, zone.name),
                    notifyAdminZoneAssigned(driver.name, zone.name)
                ]);
            }
        }
    } catch (e) {
        console.error('Failed to trigger zone assignment notifications:', e);
    }
    return assignment ? [assignment] : [];
};

const getZonesForDriver = async (driverId) => {
    return await zoneRepository.findZonesByDriverId(driverId);
};

const findZoneForCoordinates = async (lat, lng) => {
    const zones = await getAllZones();
    // Search for the matching zone
    for (const zone of zones) {
        if (isPointInZone(lng, lat, zone.coordinates)) {
            return zone;
        }
    }
    return null;
};

const updateZone = async (id, { name, coordinates }) => {
    if (coordinates) {
        if (!Array.isArray(coordinates) || coordinates.length < 3) {
            throw new Error('Coordinates must be an array representing a polygon with at least 3 points');
        }
        // Retrieve all existing zones
        const existingZones = await zoneRepository.findAll();
        // Check for overlap with any other zone
        for (const zone of existingZones) {
            if (zone.id === id) continue;
            let existingCoords = zone.coordinates;
            if (typeof existingCoords === 'string') {
                existingCoords = JSON.parse(existingCoords);
            }
            if (doesOverlap(coordinates, existingCoords)) {
                throw new Error(`Zone coordinates overlap with existing zone: "${zone.name}"`);
            }
        }
    }
    
    const updated = await zoneRepository.update(id, { name, coordinates });
    if (updated && typeof updated.coordinates === 'string') {
        updated.coordinates = JSON.parse(updated.coordinates);
    }
    return updated;
};

module.exports = {
    createZone,
    getAllZones,
    deleteZone,
    assignDriverToZones,
    assignDriverToZonesWithAvailability,
    getZonesForDriver,
    findZoneForCoordinates,
    isPointInZone,
    updateZone
};
