const db = require('../../config/db');

const getAllUsers = async () => {
    const query = 'SELECT id, email, role, name,phone ,  active,company_details,vehicle_number,vehicle_type,active, created_at FROM users ORDER BY created_at DESC';
    const result = await db.query(query);
    return result.rows;
};

const getActiveDrivers = async () => {
    const query = `
        SELECT 
            u.id, u.email, u.name, u.phone, u.vehicle_number, u.vehicle_type, 
            u.rating, u.active, u.cash_in_hand, u.pending_settlement_balance,
            (SELECT COUNT(*) FROM orders o WHERE o.driver_id = u.id AND LOWER(o.status) = 'delivered') as total_deliveries
        FROM users u 
        WHERE LOWER(u.role) = 'driver' AND u.active = TRUE
    `;
    const result = await db.query(query);
    return result.rows;
};

const getClients = async () => {
    const query = "SELECT id, email, name, active, company_details, fee_type, fee_value, created_at FROM users WHERE LOWER(role) = 'client' ORDER BY created_at DESC";
    const result = await db.query(query);
    return result.rows;
};

const updateDriverStatus = async (id, active) => {
    const query = 'UPDATE users SET active = $1 WHERE id = $2 AND LOWER(role) = \'driver\' RETURNING id, active';
    const result = await db.query(query, [active, id]);
    return result.rows[0];
};

const findById = async (id) => {
    const query = 'SELECT id, email, role, name, vehicle_number, vehicle_type, active, company_details, fee_type, fee_value, cash_in_hand FROM users WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
};

const update = async (id, userData) => {
    const fields = Object.keys(userData);
    const values = Object.values(userData).map(val =>
        (val && typeof val === 'object' && !Array.isArray(val)) ? JSON.stringify(val) : val
    );
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');

    const query = `UPDATE users SET ${setClause} WHERE id = $1 RETURNING id, email, role, name, active, fee_type, fee_value`;
    const result = await db.query(query, [id, ...values]);
    return result.rows[0];
};

const deleteUser = async (id) => {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
    const result = await db.query(query, [id]);
    return result.rows[0];
};

const incrementCashInHand = async (driverId, amount, client = db) => {
    const query = 'UPDATE users SET cash_in_hand = cash_in_hand + $1 WHERE id = $2 RETURNING cash_in_hand';
    const result = await client.query(query, [amount, driverId]);
    return result.rows[0];
};

module.exports = {
    getAllUsers,
    getActiveDrivers,
    getClients,
    updateDriverStatus,
    findById,
    update,
    deleteUser,
    incrementCashInHand
};
