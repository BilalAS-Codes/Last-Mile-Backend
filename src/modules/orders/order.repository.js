const db = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

const create = async (orderData) => {
    const {
        client_id, tracking_id, pickup_address, delivery_address,
        customer_name, customer_phone, cod_amount, order_value, delivery_fee, assigned_by
    } = orderData;

    const timeline = [{ status: 'pending', timestamp: new Date().toISOString() }];

    const query = `
        INSERT INTO orders (
            tracking_id, client_id, pickup_address, delivery_address, 
            customer_name, customer_phone, cod_amount, order_value, delivery_fee, status, timeline, assigned_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10, $11)
        RETURNING *
    `;
    const values = [
        tracking_id, client_id, JSON.stringify(pickup_address), JSON.stringify(delivery_address),
        customer_name, customer_phone, cod_amount || 0, order_value || 0, delivery_fee || 0,
        JSON.stringify(timeline), assigned_by
    ];
    const result = await db.query(query, values);
    return result.rows[0];
};

const findAll = async (filters = {}) => {
    let query = `
        SELECT o.*, u1.name as client_name, u2.name as driver_name, u3.name as assigned_by_name 
        FROM orders o
        JOIN users u1 ON o.client_id = u1.id
        LEFT JOIN users u2 ON o.driver_id = u2.id
        LEFT JOIN users u3 ON o.assigned_by = u3.id
        WHERE 1=1
    `;
    const values = [];
    let count = 1;

    if (filters.status) {
        query += ` AND LOWER(o.status) = $${count++}`;
        values.push(filters.status.toLowerCase());
    }
    if (filters.client_id) {
        query += ` AND o.client_id = $${count++}`;
        values.push(filters.client_id);
    }
    if (filters.driver_id) {
        query += ` AND o.driver_id = $${count++}`;
        values.push(filters.driver_id);
    }

    query += ' ORDER BY o.created_at DESC';
    const result = await db.query(query, values);
    return result.rows;
};

const findAllAssignedToDrivers = async (driverId) => {
    const query = `
        SELECT o.*, u1.name as client_name, u2.name as driver_name, u3.name as assigned_by_name 
        FROM orders o
        JOIN users u1 ON o.client_id = u1.id
        LEFT JOIN users u2 ON o.driver_id = u2.id
        LEFT JOIN users u3 ON o.assigned_by = u3.id
        WHERE o.driver_id = $1 
        ORDER BY o.created_at DESC
    `;
    const result = await db.query(query, [driverId]);
    return result.rows;
};

const findById = async (id) => {
    const query = `
        SELECT o.*, u1.name as client_name, u2.name as driver_name, u3.name as assigned_by_name 
        FROM orders o
        JOIN users u1 ON o.client_id = u1.id
        LEFT JOIN users u2 ON o.driver_id = u2.id
        LEFT JOIN users u3 ON o.assigned_by = u3.id
        WHERE o.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
};

const findByIds = async (ids) => {
    const query = `
        SELECT o.*, u1.name as client_name 
        FROM orders o
        JOIN users u1 ON o.client_id = u1.id
        WHERE o.id = ANY($1)
    `;
    const result = await db.query(query, [ids]);
    return result.rows;
};

const update = async (id, updateData, client = db) => {
    const fields = Object.keys(updateData);
    const values = Object.values(updateData).map(val =>
        (val && typeof val === 'object' && !Array.isArray(val)) ? JSON.stringify(val) : val
    );
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');

    const query = `UPDATE orders SET ${setClause} WHERE id = $1 RETURNING *`;
    const result = await client.query(query, [id, ...values]);
    return result.rows[0];
};

const updateStatus = async (id, status, codCollected = null, client = db) => {
    const lowerStatus = status.toLowerCase();
    const timelineEntry = JSON.stringify({ status: lowerStatus, timestamp: new Date().toISOString() });

    let query = `
        UPDATE orders 
        SET status = $1, 
            timeline = timeline || $2::jsonb
    `;
    const values = [lowerStatus, `[${timelineEntry}]`, id];

    if (codCollected !== null) {
        query += `, cod_collected = $4`;
        values.push(codCollected);
    }

    query += ` WHERE id = $3 RETURNING *`;

    const result = await client.query(query, values);
    return result.rows[0];
};

const remove = async (id) => {
    const query = 'DELETE FROM orders WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
};

module.exports = {
    create,
    findAll,
    findById,
    findByIds,
    update,
    updateStatus,
    remove,
    findAllAssignedToDrivers
};
