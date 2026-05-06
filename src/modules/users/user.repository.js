const db = require('../../config/db');

class UserRepository {
    async getAllUsers() {
        const query = 'SELECT id, email, role, name, active,company_details,vehicle_number,vehicle_type,active, created_at FROM users ORDER BY created_at DESC';
        const result = await db.query(query);
        return result.rows;
    }

    async getActiveDrivers() {
        const query = "SELECT id, email, name, vehicle_number, vehicle_type, rating, active FROM users WHERE role = 'driver' AND active = TRUE";
        const result = await db.query(query);
        return result.rows;
    }

    async getClients() {
        const query = "SELECT id, email, name, active, company_details, fee_type, fee_value, created_at FROM users WHERE role = 'client' ORDER BY created_at DESC";
        const result = await db.query(query);
        return result.rows;
    }

    async updateDriverStatus(id, active) {
        const query = 'UPDATE users SET active = $1 WHERE id = $2 AND role = \'driver\' RETURNING id, active';
        const result = await db.query(query, [active, id]);
        return result.rows[0];
    }

    async findById(id) {
        const query = 'SELECT id, email, role, name, vehicle_number, vehicle_type, active, company_details, fee_type, fee_value FROM users WHERE id = $1';
        const result = await db.query(query, [id]);
        return result.rows[0];
    }

    async update(id, userData) {
        const fields = Object.keys(userData);
        const values = Object.values(userData).map(val =>
            (val && typeof val === 'object' && !Array.isArray(val)) ? JSON.stringify(val) : val
        );
        const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');

        const query = `UPDATE users SET ${setClause} WHERE id = $1 RETURNING id, email, role, name, active, fee_type, fee_value`;
        const result = await db.query(query, [id, ...values]);
        return result.rows[0];
    }

    async delete(id) {
        const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
        const result = await db.query(query, [id]);
        return result.rows[0];
    }

    async incrementCashInHand(driverId, amount, client = db) {
        const query = 'UPDATE users SET cash_in_hand = cash_in_hand + $1 WHERE id = $2 RETURNING cash_in_hand';
        const result = await client.query(query, [amount, driverId]);
        return result.rows[0];
    }
}

module.exports = new UserRepository();
