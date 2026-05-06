const billingRepository = require('./billing.repository');
const userRepository = require('../users/user.repository');
const db = require('../../config/db');
const { sendInvoiceNotification } = require('../../utils/mail');

class BillingService {
    async generateInvoice(client_id, billing_period, due_date) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            const ordersQuery = 'SELECT id, delivery_fee FROM orders WHERE client_id = $1 AND status = \'delivered\' AND invoice_id IS NULL';
            const ordersResult = await client.query(ordersQuery, [client_id]);
            const orders = ordersResult.rows;

            if (orders.length === 0) {
                throw new Error('No uninvoiced delivered orders found for this client');
            }

            console.log(`Service (Generate): Found ${orders.length} orders. Fees:`, orders.map(o => o.delivery_fee));
            const total_amount = orders.reduce((sum, order) => {
                const fee = parseFloat(order.delivery_fee || 0);
                console.log(`Adding fee: ${fee} to sum: ${sum}`);
                return sum + fee;
            }, 0);
            console.log(`Service (Generate): Final total_amount: ${total_amount}`);
            const orderIds = orders.map(o => o.id);

            const invoice = await billingRepository.createInvoice({
                client_id,
                total_amount,
                billing_period,
                orders: orderIds,
                due_date,
                extra_charges: 0
            }, client);

            await billingRepository.linkOrdersToInvoice(orderIds, invoice.id, client);

            await client.query('COMMIT');

            // 5. Send Notification (Background)
            this.notifyClient(client_id, invoice).catch(err => console.error('Notification Error:', err));

            return invoice;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async getUninvoicedOrders(clientId) {
        return await billingRepository.getUninvoicedOrders(clientId);
    }

    async createInvoiceWithFees(orderIds, billing_period, due_date, extra_charges = 0) {
        if (!orderIds || orderIds.length === 0) {
            throw new Error('No orders selected');
        }

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Fetch orders (including precomputed delivery_fee)
            const ordersQuery = `
                SELECT id, delivery_fee, client_id 
                FROM orders 
                WHERE id = ANY($1) AND invoice_id IS NULL
            `;
            const ordersResult = await client.query(ordersQuery, [orderIds]);
            const orders = ordersResult.rows;


            console.log(orders, 'orders');

            if (orders.length === 0) {
                throw new Error('None of the selected orders are available for invoicing');
            }

            const clientId = orders[0].client_id;
            // Verify all orders are from the same client
            if (orders.some(o => o.client_id !== clientId)) {
                throw new Error('All orders must belong to the same client');
            }

            // 2. Sum precomputed fees and add extra charges
            console.log(`Service (Manual): Found ${orders.length} orders. Fees:`, orders.map(o => o.delivery_fee));
            const ordersTotal = orders.reduce((sum, order) => {
                const fee = parseFloat(order.delivery_fee || 0);
                console.log(`Adding fee: ${fee} to sum: ${sum}`);
                return sum + fee;
            }, 0);
            const total_amount = ordersTotal + parseFloat(extra_charges || 0);
            console.log(`Service (Manual): Orders Total: ${ordersTotal}, Extra: ${extra_charges}, Final: ${total_amount}`);

            // 3. Create invoice
            const invoice = await billingRepository.createInvoice({
                client_id: clientId,
                total_amount,
                billing_period,
                orders: orderIds,
                due_date,
                extra_charges
            }, client);

            // 4. Link orders to invoice (no fee update needed as they are precomputed)
            await billingRepository.linkOrdersToInvoice(orderIds, invoice.id, client);

            await client.query('COMMIT');

            // 5. Send Notification (Background)
            this.notifyClient(clientId, invoice).catch(err => console.error('Notification Error:', err));

            return invoice;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async getClientInvoices(clientId) {
        return await billingRepository.getInvoicesByClient(clientId);
    }

    async listAllInvoices() {
        return await billingRepository.getAllInvoices();
    }

    async markAsPaid(invoiceId) {
        const invoice = await billingRepository.updateInvoiceStatus(invoiceId, 'PAID');
        if (!invoice) throw new Error('Invoice not found');
        return invoice;
    }

    async getRevenueStats() {
        return await billingRepository.getFinancialStats();
    }

    // Helper for email notifications
    async notifyClient(clientId, invoice) {
        try {
            const user = await userRepository.findById(clientId);
            if (!user) return;

            // Extract billing email from company_details
            const companyDetails = user.company_details;
            const billingEmail = companyDetails?.billingEmail || user.email;

            if (billingEmail) {
                await sendInvoiceNotification(billingEmail, {
                    clientName: user.name,
                    amount: invoice.total_amount,
                    billingPeriod: invoice.billing_period,
                    dueDate: invoice.due_date,
                    invoiceId: invoice.id
                });
                console.log(`Invoice notification sent to ${billingEmail}`);
            }
        } catch (err) {
            console.error('Failed to send invoice notification:', err);
        }
    }
}

module.exports = new BillingService();
