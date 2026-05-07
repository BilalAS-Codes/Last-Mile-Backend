const db = require('../../config/db');

const getStats = async () => {
    // Total cash currently with drivers (sum of their cash_in_hand)
    const totalCashQuery = `
        SELECT COALESCE(SUM(cash_in_hand), 0) as total 
        FROM users 
        WHERE LOWER(role) = 'driver'
    `;
    
    // Total amount consolidated/settled today (approved status)
    const consolidatedTodayQuery = `
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM settlements 
        WHERE LOWER(status) = 'approved' AND created_at >= CURRENT_DATE
    `;

    // Total pending settlements
    const pendingQuery = `
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM settlements 
        WHERE LOWER(status) = 'pending'
    `;

    const [totalCash, consolidatedToday, pending] = await Promise.all([
        db.query(totalCashQuery),
        db.query(consolidatedTodayQuery),
        db.query(pendingQuery)
    ]);

    return {
        totalCashWithDrivers: parseFloat(totalCash.rows[0].total),
        consolidatedToday: parseFloat(consolidatedToday.rows[0].total),
        pendingConsolidation: parseFloat(pending.rows[0].total)
    };
};

const getSettlementHistory = async () => {
    const query = `
        SELECT 
            s.id,
            s.amount,
            s.status,
            s.created_at,
            u.name as driver_name,
            u.email as driver_email,
            a.name as admin_name
        FROM settlements s
        JOIN users u ON s.driver_id = u.id
        LEFT JOIN users a ON s.admin_id = a.id
        ORDER BY s.created_at DESC
    `;
    const result = await db.query(query);
    return result.rows;
};

const getDriverSettlementHistory = async (driverId) => {
    const query = `
        SELECT 
            s.id,
            s.amount,
            s.status,
            s.created_at,
            a.name as admin_name
        FROM settlements s
        LEFT JOIN users a ON s.admin_id = a.id
        WHERE s.driver_id = $1
        ORDER BY s.created_at DESC
    `;
    const result = await db.query(query, [driverId]);
    return result.rows;
};

module.exports = {
    getStats,
    getSettlementHistory,
    getDriverSettlementHistory
};
