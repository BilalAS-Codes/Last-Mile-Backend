const billingRepository = require('./billing.repository');
const db = require('../../config/db');

class BillingService {
    async generateInvoice(client_id, billing_period) {
        // Logic to calculate total amount could go here
        // For example, count orders for this client in the period
        const countQuery = 'SELECT COUNT(*) FROM orders WHERE client_id = $1 AND status = \'Delivered\'';
        const countResult = await db.query(countQuery, [client_id]);
        const orderCount = parseInt(countResult.rows[0].count);
        
        const feePerOrder = 10.00; // Example fee
        const total_amount = orderCount * feePerOrder;

        return await billingRepository.createInvoice({
            client_id,
            total_amount,
            billing_period
        });
    }

    async getClientInvoices(clientId) {
        return await billingRepository.getInvoicesByClient(clientId);
    }

    async listAllInvoices() {
        return await billingRepository.getAllInvoices();
    }

    async getRevenueStats() {
        return await billingRepository.getFinancialStats();
    }
}

module.exports = new BillingService();
