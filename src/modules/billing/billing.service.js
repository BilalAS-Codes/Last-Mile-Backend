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
                extra_charges: invoice.extra_charges
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
                invoiceId: invoice.id
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

        const ordersQuery = 'SELECT id, delivery_fee FROM orders WHERE client_id = $1 AND LOWER(status) = \'delivered\' AND invoice_id IS NULL';
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
            extra_charges: 0
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

        const ordersTotal = orders.reduce((sum, order) => sum + parseFloat(order.delivery_fee || 0), 0);
        const total_amount = ordersTotal + parseFloat(extra_charges || 0);

        const invoice = await billingRepository.createInvoice({
            client_id: clientId,
            total_amount,
            billing_period,
            orders: orderIds,
            due_date,
            extra_charges
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

const getUnderpaidReport = async () => {
    const invoices = await billingRepository.getUnderpaidInvoices();
    
    // Group by month for chart data
    const chartData = invoices.reduce((acc, inv) => {
        const month = new Date(inv.created_at).toLocaleString('default', { month: 'short', year: 'numeric' });
        if (!acc[month]) {
            acc[month] = { month, revenue: 0, count: 0 };
        }
        acc[month].revenue += parseFloat(inv.total_amount || 0);
        acc[month].count += 1;
        return acc;
    }, {});

    return {
        total_underpaid_invoices: invoices.length,
        total_underpaid_amount: invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0),
        chartData: Object.values(chartData).reverse(),
        invoices: invoices
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
    getUnderpaidReport,
    notifyClient
};
