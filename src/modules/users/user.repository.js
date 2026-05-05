const db = require('../../config/db');

class UserRepository {
    async getAllUsers() {
        const query = 'SELECT id, email, role, name, active, created_at FROM users ORDER BY created_at DESC';
        const result = await db.query(query);
        return result.rows;
    }

    async getActiveDrivers() {
        const query = "SELECT id, email, name, vehicle_number, vehicle_type, rating, active FROM users WHERE role = 'DRIVER' AND active = TRUE";
        const result = await db.query(query);
        return result.rows;
    }

    async updateDriverStatus(id, active) {
        const query = 'UPDATE users SET active = $1 WHERE id = $2 AND role = \'DRIVER\' RETURNING id, active';
        const result = await db.query(query, [active, id]);
        return result.rows[0];
    }
}

module.exports = new UserRepository();
