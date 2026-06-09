const db = require('../../config/db');

const create = async ({ name, coordinates }) => {
    const query = `
        INSERT INTO zones (name, coordinates)
        VALUES ($1, $2)
        RETURNING *
    `;
    const result = await db.query(query, [name, JSON.stringify(coordinates)]);
    return result.rows[0];
};

const findAll = async () => {
    const query = `
        SELECT * FROM zones
        ORDER BY name ASC
    `;
    const result = await db.query(query);
    return result.rows;
};

const findById = async (id) => {
    const query = `
        SELECT * FROM zones
        WHERE id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
};

const deleteZone = async (id) => {
    const query = `
        DELETE FROM zones
        WHERE id = $1
        RETURNING *
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
};

const assignDriver = async (driverId, zoneId) => {
    const query = `
        INSERT INTO driver_zones (driver_id, zone_id)
        VALUES ($1, $2)
        ON CONFLICT (driver_id, zone_id) DO NOTHING
        RETURNING *
    `;
    const result = await db.query(query, [driverId, zoneId]);
    return result.rows[0];
};

const removeDriverAssignment = async (driverId, zoneId) => {
    const query = `
        DELETE FROM driver_zones
        WHERE driver_id = $1 AND zone_id = $2
        RETURNING *
    `;
    const result = await db.query(query, [driverId, zoneId]);
    return result.rows[0];
};

const removeAllDriverAssignments = async (driverId) => {
    const query = `
        DELETE FROM driver_zones
        WHERE driver_id = $1
    `;
    await db.query(query, [driverId]);
};

const findZonesByDriverId = async (driverId) => {
    const query = `
        SELECT z.* 
        FROM zones z
        JOIN driver_zones dz ON z.id = dz.zone_id
        WHERE dz.driver_id = $1
    `;
    const result = await db.query(query, [driverId]);
    return result.rows;
};

const findDriversByZoneId = async (zoneId) => {
    const query = `
        SELECT u.id, u.name, u.email, u.phone, u.active, u.vehicle_number, u.vehicle_type
        FROM users u
        JOIN driver_zones dz ON u.id = dz.driver_id
        WHERE dz.zone_id = $1 AND LOWER(u.role) = 'driver'
    `;
    const result = await db.query(query, [zoneId]);
    return result.rows;
};

const update = async (id, { name, coordinates }) => {
    const query = `
        UPDATE zones
        SET name = COALESCE($1, name),
            coordinates = COALESCE($2, coordinates)
        WHERE id = $3
        RETURNING *
    `;
    const result = await db.query(query, [
        name || null,
        coordinates ? JSON.stringify(coordinates) : null,
        id
    ]);
    return result.rows[0];
};

module.exports = {
    create,
    findAll,
    findById,
    deleteZone,
    assignDriver,
    removeDriverAssignment,
    removeAllDriverAssignments,
    findZonesByDriverId,
    findDriversByZoneId,
    update
};
