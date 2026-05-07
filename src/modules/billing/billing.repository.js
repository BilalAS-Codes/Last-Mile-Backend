const db = require('../../config/db');

const createInvoice = async (invoiceData, client = db) => {
    const { client_id, total_amount, billing_period, orders, due_date, extra_charges } = invoiceData;
    const query = `
        INSERT INTO invoices (client_id, total_amount, billing_period, status, orders, due_date, extra_charges)
        VALUES ($1, $2, $3, 'unpaid', $4, $5, $6)
        RETURNING *
    `;
    const result = await client.query(query, [client_id, total_amount, billing_period, JSON.stringify(orders || []), due_date, extra_charges || 0]);
    return result.rows[0];
};

const getUninvoicedOrders = async (clientId) => {
    let query = `
        SELECT o.* 
        FROM orders o 
        WHERE LOWER(TRIM(o.status)) = 'delivered'
        AND o.invoice_id IS NULL
    `;
    const values = [];
    if (clientId && clientId.trim() !== '') {
        query += ' AND o.client_id::text = $1';
        values.push(clientId.trim());
    }

    const result = await db.query(query, values);
    return result.rows;
};

const linkOrdersToInvoice = async (orderIds, invoiceId, client = db) => {
    const query = 'UPDATE orders SET invoice_id = $1 WHERE id = ANY($2) RETURNING id';
    const result = await client.query(query, [invoiceId, orderIds]);
    return result.rows;
};

const updateOrderFees = async (orderDataArray, invoiceId, client = db) => {
    const queries = orderDataArray.map(item => {
        return client.query(
            'UPDATE orders SET delivery_fee = $1, invoice_id = $2 WHERE id = $3',
            [item.delivery_fee, invoiceId, item.id]
        );
    });
    await Promise.all(queries);
};

const getInvoicesByClient = async (clientId) => {
    const query = `
        SELECT i.*, u.name as client_name 
        FROM invoices i
        JOIN users u ON i.client_id = u.id
        WHERE i.client_id = $1 
        ORDER BY i.created_at DESC
    `;
    const result = await db.query(query, [clientId]);
    return result.rows;
};

const getAllInvoices = async () => {
    const query = `
        SELECT i.*, u.name as client_name 
        FROM invoices i
        JOIN users u ON i.client_id = u.id
        ORDER BY i.created_at DESC
    `;
    const result = await db.query(query);
    return result.rows;
};

const updateInvoiceStatus = async (id, status) => {
    const query = 'UPDATE invoices SET status = $1 WHERE id = $2 RETURNING *';
    const result = await db.query(query, [status.toLowerCase(), id]);
    return result.rows[0];
};

const getFinancialStats = async () => {
    const statsQuery = `
        SELECT 
            COALESCE(SUM(delivery_fee), 0) as total_revenue,
            COALESCE(SUM(CASE WHEN LOWER(status) = 'delivered' THEN cod_amount ELSE 0 END), 0) as total_cod_collected,
            (SELECT COALESCE(SUM(outstanding_balance), 0) FROM invoices) as total_outstanding
        FROM orders
    `;
    const result = await db.query(statsQuery);
    return result.rows[0];
};

const getUnderpaidInvoices = async () => {
    const query = `
        SELECT i.*, u.name as client_name 
        FROM invoices i
        JOIN users u ON i.client_id = u.id
        WHERE LOWER(i.status) IN ('unpaid', 'overdue', 'under_paid')
        ORDER BY i.created_at DESC
    `;
    const result = await db.query(query);
    return result.rows;
};

const getOrdersByIds = async (orderIds) => {
    const query = 'SELECT * FROM orders WHERE id = ANY($1)';
    const result = await db.query(query, [orderIds]);
    return result.rows;
};

module.exports = {
    createInvoice,
    getUninvoicedOrders,
    linkOrdersToInvoice,
    updateOrderFees,
    getInvoicesByClient,
    getAllInvoices,
    updateInvoiceStatus,
    getFinancialStats,
    getOrdersByIds,
    getUnderpaidInvoices
};
