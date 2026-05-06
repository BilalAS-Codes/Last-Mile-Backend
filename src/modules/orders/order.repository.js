const db = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

class OrderRepository {
    async create(orderData) {
        const {
            client_id, tracking_id, pickup_address, delivery_address,
            customer_name, customer_phone, cod_amount, order_value, delivery_fee
        } = orderData;

        const timeline = [{ status: 'pending', timestamp: new Date().toISOString() }];

        const query = `
            INSERT INTO orders (
                tracking_id, client_id, pickup_address, delivery_address, 
                customer_name, customer_phone, cod_amount, order_value, delivery_fee, status, timeline
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10)
            RETURNING *
        `;
        const values = [
            tracking_id, client_id, JSON.stringify(pickup_address), JSON.stringify(delivery_address),
            customer_name, customer_phone, cod_amount || 0, order_value || 0, delivery_fee || 0,
            JSON.stringify(timeline)
        ];
        const result = await db.query(query, values);
        return result.rows[0];
    }

    async findAll(filters = {}) {
        let query = `
            SELECT o.*, u1.name as client_name, u2.name as driver_name 
            FROM orders o
            JOIN users u1 ON o.client_id = u1.id
            LEFT JOIN users u2 ON o.driver_id = u2.id
            WHERE 1=1
        `;
        const values = [];
        let count = 1;

        if (filters.status) {
            query += ` AND o.status = $${count++}`;
            values.push(filters.status);
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
    }

    async findById(id) {
        const query = `
            SELECT o.*, u1.name as client_name, u2.name as driver_name 
            FROM orders o
            JOIN users u1 ON o.client_id = u1.id
            LEFT JOIN users u2 ON o.driver_id = u2.id
            WHERE o.id = $1
        `;
        const result = await db.query(query, [id]);
        return result.rows[0];
    }

    async findByIds(ids) {
        const query = `
            SELECT o.*, u1.name as client_name 
            FROM orders o
            JOIN users u1 ON o.client_id = u1.id
            WHERE o.id = ANY($1)
        `;
        const result = await db.query(query, [ids]);
        return result.rows;
    }

    async update(id, updateData, client = db) {
        const fields = Object.keys(updateData);
        const values = Object.values(updateData).map(val =>
            (val && typeof val === 'object' && !Array.isArray(val)) ? JSON.stringify(val) : val
        );
        const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');

        const query = `UPDATE orders SET ${setClause} WHERE id = $1 RETURNING *`;
        const result = await client.query(query, [id, ...values]);
        return result.rows[0];
    }

    async updateStatus(id, status, codCollected = null, client = db) {
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
    }
}

module.exports = new OrderRepository();
