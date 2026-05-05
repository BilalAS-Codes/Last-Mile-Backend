const db = require('../../config/db');

class BillingRepository {
    async createInvoice(invoiceData) {
        const { client_id, total_amount, billing_period } = invoiceData;
        const query = `
            INSERT INTO invoices (client_id, total_amount, billing_period, status)
            VALUES ($1, $2, $3, 'UNPAID')
            RETURNING *
        `;
        const result = await db.query(query, [client_id, total_amount, billing_period]);
        return result.rows[0];
    }

    async getInvoicesByClient(clientId) {
        const query = 'SELECT * FROM invoices WHERE client_id = $1 ORDER BY created_at DESC';
        const result = await db.query(query, [clientId]);
        return result.rows;
    }

    async getAllInvoices() {
        const query = 'SELECT * FROM invoices ORDER BY created_at DESC';
        const result = await db.query(query);
        return result.rows;
    }

    async getFinancialStats() {
        const statsQuery = `
            SELECT 
                COALESCE(SUM(delivery_fee), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN status = 'DELIVERED' THEN cod_amount ELSE 0 END), 0) as total_cod_collected,
                (SELECT COALESCE(SUM(outstanding_balance), 0) FROM invoices) as total_outstanding
            FROM orders
        `;
        const result = await db.query(statsQuery);
        return result.rows[0];
    }
}

module.exports = new BillingRepository();
