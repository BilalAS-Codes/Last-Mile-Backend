const db = require('../../config/db');

class WalletRepository {
    async getUnsettledFunds(driverId) {
        // Sum of COD collected by driver that hasn't been settled
        // For simplicity, we'll just sum all cod_amount where cod_collected is true
        const query = `
            SELECT SUM(cod_amount) as total_cash 
            FROM orders 
            WHERE driver_id = $1 AND cod_collected = TRUE
        `;
        const result = await db.query(query, [driverId]);
        return result.rows[0].total_cash || 0;
    }

    async createSettlement(driverId, amount) {
        const query = `
            INSERT INTO settlements (driver_id, amount, status)
            VALUES ($1, $2, 'PENDING')
            RETURNING *
        `;
        const result = await db.query(query, [driverId, amount]);
        return result.rows[0];
    }

    async getAllSettlements() {
        const query = `
            SELECT s.*, u.name as driver_name 
            FROM settlements s
            JOIN users u ON s.driver_id = u.id
            ORDER BY s.created_at DESC
        `;
        const result = await db.query(query);
        return result.rows;
    }

    async updateSettlementStatus(id, status) {
        const query = `
            UPDATE settlements 
            SET status = $1 
            WHERE id = $2 
            RETURNING *
        `;
        const result = await db.query(query, [status, id]);
        return result.rows[0];
    }
}

module.exports = new WalletRepository();
