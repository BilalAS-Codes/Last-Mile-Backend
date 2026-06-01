const db = require('../../config/db');

const addLocation = async (driverId, latitude, longitude) => {
    const query = `
        INSERT INTO driver_locations (driver_id, latitude, longitude, updated_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING *;
    `;
    const result = await db.query(query, [driverId, latitude, longitude]);
    return result.rows[0];
};

const getLatestLocations = async () => {
    const query = `
        SELECT DISTINCT ON (driver_id) id, driver_id, latitude, longitude, created_at, updated_at
        FROM driver_locations
        ORDER BY driver_id, created_at DESC;
    `;
    const result = await db.query(query);
    return result.rows || [];
};

const getDriverLocation = async (driverId) => {
    const query = `
        SELECT id, driver_id, latitude, longitude, created_at, updated_at
        FROM driver_locations
        WHERE driver_id = $1
        ORDER BY created_at DESC
        LIMIT 1;
    `;
    const result = await db.query(query, [driverId]);
    return result.rows[0] || null;
};

module.exports = {
    addLocation,
    getLatestLocations,
    getDriverLocation
};
