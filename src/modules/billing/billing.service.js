const billingRepository = require('./billing.repository');
const userRepository = require('../users/user.repository');
const db = require('../../config/db');
const { sendInvoiceNotification } = require('../../utils/mail');
const invoiceGenerator = require('../../utils/invoiceGenerator');

// Helper for email notifications
const notifyClient = async (clientId, invoice) => {
    try {
        const user = await userRepository.findById(clientId);
        if (!user) return;

        // Extract billing email from company_details
        const companyDetails = user.company_details;
        const billingEmail = companyDetails?.billingEmail || user.email;

        if (billingEmail) {
            // Fetch full order details for the invoice
            const orders = await billingRepository.getOrdersByIds(invoice.orders || []);

            // Generate Attachments
            const excelBuffer = await invoiceGenerator.generateExcel(orders);
            const pdfBuffer = await invoiceGenerator.generatePDF({
                clientName: user.name,
                amount: invoice.total_amount,
                billingPeriod: invoice.billing_period,
                dueDate: invoice.due_date,
                invoiceId: invoice.id,
                extra_charges: invoice.extra_charges,
                currency: invoice.currency || user.currency || 'SAR'
            }, orders);

            const attachments = [
                {
                    filename: `Invoice_${invoice.id}.pdf`,
                    content: pdfBuffer
                },
                {
                    filename: `Order_Details_${invoice.id}.xlsx`,
                    content: excelBuffer
                }
            ];

            await sendInvoiceNotification(billingEmail, {
                clientName: user.name,
                amount: invoice.total_amount,
                billingPeriod: invoice.billing_period,
                dueDate: invoice.due_date,
                invoiceId: invoice.id,
                currency: invoice.currency || user.currency || 'SAR'
            }, attachments);
            console.log(`Invoice notification with attachments sent to ${billingEmail}`);
        }
    } catch (err) {
        console.error('Failed to send invoice notification:', err);
    }
};

const generateInvoice = async (client_id, billing_period, due_date) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // Fetch client to get their registered currency
        const clientUser = await userRepository.findById(client_id);
        const currency = clientUser?.currency || 'SAR';

        const ordersQuery = `SELECT id, delivery_fee FROM orders WHERE client_id = $1 AND LOWER(status) IN ('delivered' , 'canceled') AND invoice_id IS NULL`;
        const ordersResult = await client.query(ordersQuery, [client_id]);
        const orders = ordersResult.rows;

        if (orders.length === 0) {
            throw new Error('No uninvoiced delivered orders found for this client');
        }

        const total_amount = orders.reduce((sum, order) => sum + parseFloat(order.delivery_fee || 0), 0);
        const orderIds = orders.map(o => o.id);

        const invoice = await billingRepository.createInvoice({
            client_id,
            total_amount,
            billing_period,
            orders: orderIds,
            due_date,
            extra_charges: 0,
            currency
        }, client);

        await billingRepository.linkOrdersToInvoice(orderIds, invoice.id, client);

        await client.query('COMMIT');

        // Send Notification (Background)
        notifyClient(client_id, invoice).catch(err => console.error('Notification Error:', err));

        return invoice;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

const getUninvoicedOrders = async (clientId) => {
    return await billingRepository.getUninvoicedOrders(clientId);
};

const createInvoiceWithFees = async (orderIds, billing_period, due_date, extra_charges = 0) => {
    if (!orderIds || orderIds.length === 0) {
        throw new Error('No orders selected');
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const ordersQuery = `
            SELECT id, delivery_fee, client_id 
            FROM orders 
            WHERE id = ANY($1) AND invoice_id IS NULL
        `;
        const ordersResult = await client.query(ordersQuery, [orderIds]);
        const orders = ordersResult.rows;

        if (orders.length === 0) {
            throw new Error('None of the selected orders are available for invoicing');
        }

        const clientId = orders[0].client_id;
        if (orders.some(o => o.client_id !== clientId)) {
            throw new Error('All orders must belong to the same client');
        }

        // Fetch client to get their registered currency
        const clientUser = await userRepository.findById(clientId);
        const currency = clientUser?.currency || 'SAR';

        const ordersTotal = orders.reduce((sum, order) => sum + parseFloat(order.delivery_fee || 0), 0);
        const total_amount = ordersTotal + parseFloat(extra_charges || 0);

        const invoice = await billingRepository.createInvoice({
            client_id: clientId,
            total_amount,
            billing_period,
            orders: orderIds,
            due_date,
            extra_charges,
            currency
        }, client);

        await billingRepository.linkOrdersToInvoice(orderIds, invoice.id, client);

        await client.query('COMMIT');

        // Send Notification (Background)
        notifyClient(clientId, invoice).catch(err => console.error('Notification Error:', err));

        return invoice;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

const getClientInvoices = async (clientId) => {
    return await billingRepository.getInvoicesByClient(clientId);
};

const listAllInvoices = async () => {
    return await billingRepository.getAllInvoices();
};

const markAsPaid = async (invoiceId) => {
    const invoice = await billingRepository.updateInvoiceStatus(invoiceId, 'paid');
    if (!invoice) throw new Error('Invoice not found');
    return invoice;
};

const getRevenueStats = async () => {
    return await billingRepository.getFinancialStats();
};

const getRevenueChartData = async () => {
    const chartData = await billingRepository.getRevenueChartData();
    const stats = await billingRepository.getFinancialStats();

    return {
        revenue_stats: {
            total_revenue: stats.total_revenue,
            total_orders: stats.total_orders,
            total_outstanding: stats.total_outstanding,
            total_cod_collected: stats.total_cod_collected
        },
        charts: {
            weekly: chartData.weekly,
            monthly: chartData.monthly
        }
    };
};

module.exports = {
    generateInvoice,
    getUninvoicedOrders,
    createInvoiceWithFees,
    getClientInvoices,
    listAllInvoices,
    markAsPaid,
    getRevenueStats,
    getRevenueChartData,
    notifyClient
};
