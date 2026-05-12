const db = require('../../config/db');

const getUnsettledFunds = async (driverId) => {
    const query = `
        SELECT SUM(cod_amount) as total_cash 
        FROM orders 
        WHERE driver_id = $1 AND cod_collected = TRUE
    `;
    const result = await db.query(query, [driverId]);
    return result.rows[0].total_cash || 0;
};

const createSettlementWithLock = async (driverId, amount) => {
    s
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const userQuery = 'SELECT cash_in_hand, pending_settlement_balance FROM users WHERE id = $1 FOR UPDATE';
        const userRes = await client.query(userQuery, [driverId]);
        const user = userRes.rows[0];

        if (!user) throw new Error('Driver not found');

        const available = parseFloat(user.cash_in_hand || 0) - parseFloat(user.pending_settlement_balance || 0);
        if (amount > available) {
            throw new Error(`Insufficient available cash. You have $${available.toFixed(2)} available ($${user.pending_settlement_balance} is already locked in pending requests).`);
        }

        const createSettlementQuery = `
            INSERT INTO settlements (driver_id, amount, status)
            VALUES ($1, $2, 'pending')
            RETURNING *
        `;
        const settlementRes = await client.query(createSettlementQuery, [driverId, amount]);

        const updatePendingQuery = 'UPDATE users SET pending_settlement_balance = pending_settlement_balance + $1 WHERE id = $2';
        await client.query(updatePendingQuery, [amount, driverId]);

        await client.query('COMMIT');
        return settlementRes.rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

const getAllSettlements = async () => {
    const query = `
        SELECT s.*, u.name as driver_name 
        FROM settlements s
        JOIN users u ON s.driver_id = u.id
        ORDER BY s.created_at DESC
    `;
    const result = await db.query(query);
    return result.rows;
};

const updateSettlementStatus = async (id, status, adminId) => {
    const query = `
        UPDATE settlements 
        SET status = $1, admin_id = $2
        WHERE id = $3 
        RETURNING *
    `;
    const result = await db.query(query, [status.toLowerCase(), adminId, id]);
    return result.rows[0];
};

const approveSettlementWithTransaction = async (id, adminId) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const settlementQuery = 'SELECT driver_id, amount, status FROM settlements WHERE id = $1 FOR UPDATE';
        const settlementRes = await client.query(settlementQuery, [id]);
        const settlement = settlementRes.rows[0];

        if (!settlement) throw new Error('Settlement not found');
        if (settlement.status.toLowerCase() === 'approved') {
            throw new Error('Settlement already approved');
        }

        const updateSettlementQuery = `
            UPDATE settlements 
            SET status = 'approved', admin_id = $1, updated_at = NOW() 
            WHERE id = $2 
            RETURNING *
        `;
        const updatedSettlementRes = await client.query(updateSettlementQuery, [adminId, id]);

        const updateDriverQuery = `
            UPDATE users 
            SET cash_in_hand = cash_in_hand - $1,
                pending_settlement_balance = pending_settlement_balance - $1
            WHERE id = $2 
            RETURNING cash_in_hand
        `;
        await client.query(updateDriverQuery, [settlement.amount, settlement.driver_id]);

        await client.query('COMMIT');
        return updatedSettlementRes.rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

const directSettlementWithTransaction = async (driverId, amount, adminId) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const userQuery = 'SELECT cash_in_hand, pending_settlement_balance FROM users WHERE id = $1 FOR UPDATE';
        const userRes = await client.query(userQuery, [driverId]);
        const user = userRes.rows[0];

        if (!user) throw new Error('Driver not found');

        const available = parseFloat(user.cash_in_hand || 0) - parseFloat(user.pending_settlement_balance || 0);
        if (amount > available) {
            throw new Error(`Cannot settle $${amount}. Only $${available.toFixed(2)} is available ($${user.pending_settlement_balance} is locked in pending requests).`);
        }

        const createSettlementQuery = `
            INSERT INTO settlements (driver_id, amount, status, admin_id, created_at, updated_at)
            VALUES ($1, $2, 'approved', $3, NOW(), NOW())
            RETURNING *
        `;
        const settlementRes = await client.query(createSettlementQuery, [driverId, amount, adminId]);

        const updateDriverQuery = `
            UPDATE users 
            SET cash_in_hand = cash_in_hand - $1 
            WHERE id = $2 
            RETURNING cash_in_hand
        `;
        await client.query(updateDriverQuery, [amount, driverId]);

        await client.query('COMMIT');
        return settlementRes.rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

module.exports = {
    getUnsettledFunds,
    createSettlementWithLock,
    getAllSettlements,
    updateSettlementStatus,
    approveSettlementWithTransaction,
    directSettlementWithTransaction
};
