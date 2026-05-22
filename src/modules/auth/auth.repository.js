const db = require('../../config/db');

const findByEmail = async (email) => {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await db.query(query, [email]);
    return result.rows[0];
};

const findById = async (id) => {
    const query = 'SELECT id, email,phone, role, name, company_details, vehicle_number, vehicle_type, rating, active, currency FROM users WHERE id = $1';
    const result = await db.query(query, [id]);
    console.log(result, 'result')
    return result.rows[0];
};

const createUser = async (userData) => {
    const { email, password, role, name, phone, vehicle_number, vehicle_type, company_details, currency } = userData;

    // Extract fee info if present in company_details
    const fee_type = (company_details?.feeType || 'fixed').toLowerCase();
    const fee_value = company_details?.feeValue || 0;

    const query = `
        INSERT INTO users (email, password,phone, role, name, vehicle_number, vehicle_type, company_details, fee_type, fee_value, currency)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9 , $10, $11)
        RETURNING id, email, role, name, currency
    `;
    const values = [
        email,
        password,
        phone,
        role.toLowerCase(),
        name,
        vehicle_number,
        vehicle_type,
        company_details ? JSON.stringify(company_details) : null,
        fee_type,
        fee_value,
        currency || 'SAR'
    ];
    const result = await db.query(query, values);
    return result.rows[0];
};

const updateOTP = async (email, otp, expiry) => {
    const query = 'UPDATE users SET otp = $1, otp_expiry = $2 WHERE email = $3 RETURNING *';
    const result = await db.query(query, [otp, expiry, email]);
    return result.rows[0];
};

const verifyOTP = async (email, otp) => {
    const query = 'SELECT * FROM users WHERE email = $1 AND otp = $2 AND otp_expiry > NOW()';
    const result = await db.query(query, [email, otp]);
    return result.rows[0];
};

const updatePassword = async (email, hashedPassword) => {
    const query = 'UPDATE users SET password = $1, otp = NULL, otp_expiry = NULL WHERE email = $2 RETURNING *';
    const result = await db.query(query, [hashedPassword, email]);
    return result.rows[0];
};

const createRefreshToken = async (userId, tokenHash, expiresAt) => {
    const query = `
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
        RETURNING *
    `;
    const result = await db.query(query, [userId, tokenHash, expiresAt]);
    return result.rows[0];
};

const findRefreshToken = async (tokenHash) => {
    const query = 'SELECT * FROM refresh_tokens WHERE token_hash = $1';
    const result = await db.query(query, [tokenHash]);
    return result.rows[0];
};

const revokeRefreshToken = async (tokenHash) => {
    const query = `
        UPDATE refresh_tokens
        SET is_revoked = true, updated_at = NOW()
        WHERE token_hash = $1
        RETURNING *
    `;
    const result = await db.query(query, [tokenHash]);
    return result.rows[0];
};

const deleteRefreshToken = async (tokenHash) => {
    const query = 'DELETE FROM refresh_tokens WHERE token_hash = $1 RETURNING *';
    const result = await db.query(query, [tokenHash]);
    return result.rows[0];
};

const deleteUserRefreshTokens = async (userId) => {
    const query = 'DELETE FROM refresh_tokens WHERE user_id = $1 RETURNING *';
    const result = await db.query(query, [userId]);
    return result.rows;
};

module.exports = {
    findByEmail,
    findById,
    createUser,
    updateOTP,
    verifyOTP,
    updatePassword,
    createRefreshToken,
    findRefreshToken,
    revokeRefreshToken,
    deleteRefreshToken,
    deleteUserRefreshTokens
};
