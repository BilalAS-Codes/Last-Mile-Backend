const db = require('../../config/db');

const createBatch = async ({ batchCode, driverId = null, status = 'unassigned' }, client = db) => {
    const query = `
        INSERT INTO order_batches (batch_code, driver_id, status)
        VALUES ($1, $2, $3)
        RETURNING *
    `;
    const result = await client.query(query, [batchCode, driverId, status]);
    return result.rows[0];
};

const findById = async (id) => {
    const query = `
        SELECT * FROM order_batches
        WHERE id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
};

const findUnassignedBatches = async () => {
    const query = `
        SELECT * FROM order_batches
        WHERE status = 'unassigned'
        ORDER BY created_at DESC
    `;
    const result = await db.query(query);
    return result.rows;
};

const assignDriver = async (batchId, driverId, client = db) => {
    const query = `
        UPDATE order_batches
        SET driver_id = $1, status = 'assigned', updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
    `;
    const result = await client.query(query, [driverId, batchId]);
    return result.rows[0];
};

const linkOrderToBatch = async (orderId, batchId, client = db) => {
    const query = `
        UPDATE orders
        SET batch_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
    `;
    const result = await client.query(query, [batchId, orderId]);
    return result.rows[0];
};

const updateBatchStatus = async (batchId, status, client = db) => {
    const query = `
        UPDATE order_batches
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
    `;
    const result = await client.query(query, [status, batchId]);
    return result.rows[0];
};

const getOrdersForBatch = async (batchId) => {
    const query = `
        SELECT id, tracking_id, client_id, driver_id, zone_id, status, pickup_address, delivery_address, created_at
        FROM orders
        WHERE batch_id = $1
    `;
    const result = await db.query(query, [batchId]);
    return result.rows;
};

const incrementTotalOrders = async (batchId, count, client = db) => {
    const query = `
        UPDATE order_batches
        SET total_orders = total_orders + $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
    `;
    const result = await client.query(query, [count, batchId]);
    return result.rows[0];
};

module.exports = {
    createBatch,
    findById,
    findUnassignedBatches,
    assignDriver,
    linkOrderToBatch,
    updateBatchStatus,
    getOrdersForBatch,
    incrementTotalOrders
};
