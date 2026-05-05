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
        const values = [email, password, role.toLowerCase(), name, vehicle_number, vehicle_type];
        const result = await db.query(query, values);
        return result.rows[0];
    }

    async updateOTP(email, otp, expiry) {
        const query = 'UPDATE users SET otp = $1, otp_expiry = $2 WHERE email = $3 RETURNING *';
        const result = await db.query(query, [otp, expiry, email]);
        return result.rows[0];
    }

    async verifyOTP(email, otp) {
        const query = 'SELECT * FROM users WHERE email = $1 AND otp = $2 AND otp_expiry > NOW()';
        const result = await db.query(query, [email, otp]);
        return result.rows[0];
    }

    async updatePassword(email, hashedPassword) {
        const query = 'UPDATE users SET password = $1, otp = NULL, otp_expiry = NULL WHERE email = $2 RETURNING *';
        const result = await db.query(query, [hashedPassword, email]);
        return result.rows[0];
    }
}

module.exports = new AuthRepository();
