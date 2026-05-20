const knex = require('../../config/db');

class DriverRepository {
  async addLocation(driverId, latitude, longitude) {
    const [location] = await knex('driver_locations').insert({
      driver_id: driverId,
      latitude,
      longitude
    }).returning('*');
    return location;
  }

  async getLatestLocations() {
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
    const result = await knex.raw(query);
    return result.rows || [];
  }
}

module.exports = new DriverRepository();
