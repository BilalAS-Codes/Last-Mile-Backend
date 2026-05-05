const db = require('../../config/db');

class AuthRepository {
    async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = $1';
        const result = await db.query(query, [email]);
        return result.rows[0];
    }

    async findById(id) {
        const query = 'SELECT id, email, role, name, vehicle_number, vehicle_type, rating, active FROM users WHERE id = $1';
        const result = await db.query(query, [id]);
        return result.rows[0];
    }

    async createUser(userData) {
        const { email, password, role, name, vehicle_number, vehicle_type } = userData;
        const query = `
            INSERT INTO users (email, password, role, name, vehicle_number, vehicle_type)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, email, role, name
        `;
        const values = [email, password, role, name, vehicle_number, vehicle_type];
        const result = await db.query(query, values);
        return result.rows[0];
    }
}

module.exports = new AuthRepository();
