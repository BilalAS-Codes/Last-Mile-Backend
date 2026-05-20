const db = require('../../config/db');

const addLocation = async (driverId, latitude, longitude) => {
    const query = `
        INSERT INTO driver_locations (driver_id, latitude, longitude)
        VALUES ($1, $2, $3)
        RETURNING *;
    `;
    const result = await db.query(query, [driverId, latitude, longitude]);
    return result.rows[0];
};

const getLatestLocations = async () => {
    // Gets the most recent location for each driver
    const query = `
        SELECT DISTINCT ON (driver_id)
            id,
            driver_id,
            latitude,
            longitude,
            created_at
        FROM driver_locations
        ORDER BY driver_id, created_at DESC;
    `;
    const result = await db.query(query);
    return result.rows || [];
};

module.exports = {
    addLocation,
    getLatestLocations
};
