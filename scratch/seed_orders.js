const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../src/config/db');
const { v4: uuidv4 } = require('uuid');

const ADMIN_ID = 'e88d178c-ffa9-4a27-be2a-a105542302f8'; // Alex Admin
const CLIENT_ID = '2e763f45-8a53-462d-8c0c-ea5f3ec3db45'; // Sarah Client
const DRIVER_IDS = [
    '60590b75-1638-4b38-9ba9-777a54ea613f', // Mike Mover
    'c818f85a-ae82-43a6-9d27-130ac5441a14'  // Dave Delivery
];

async function seedOrders() {
    try {
        console.log('Starting order seeding...');

        // Clear existing test data if needed (Optional, but good for clean tests)
        // await db.query("DELETE FROM orders WHERE tracking_id LIKE 'SEED-%'");

        const orders = [];

        // Seed orders for the last 7 days (Weekly Chart)
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            
            // 2-3 orders per day
            const count = Math.floor(Math.random() * 2) + 2;
            for (let j = 0; j < count; j++) {
                orders.push({
                    tracking_id: `SEED-W-${i}-${j}-${uuidv4().substring(0, 8)}`,
                    client_id: CLIENT_ID,
                    driver_id: DRIVER_IDS[j % DRIVER_IDS.length],
                    assigned_by: ADMIN_ID,
                    pickup_address: { city: 'Dubai', area: 'Al Barsha' },
                    delivery_address: { city: 'Dubai', area: 'Marina' },
                    customer_name: `Customer W${i}${j}`,
                    customer_phone: `971500000${i}${j}`,
                    cod_amount: Math.floor(Math.random() * 500) + 100,
                    order_value: Math.floor(Math.random() * 1000) + 500,
                    delivery_fee: Math.floor(Math.random() * 50) + 20,
                    status: 'delivered',
                    created_at: date.toISOString(),
                    timeline: JSON.stringify([{ status: 'delivered', timestamp: date.toISOString() }])
                });
            }
        }

        // Seed orders for the last 6 months (Monthly Chart)
        for (let i = 1; i < 6; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            
            // 5-10 orders per month
            const count = Math.floor(Math.random() * 5) + 5;
            for (let j = 0; j < count; j++) {
                orders.push({
                    tracking_id: `SEED-M-${i}-${j}-${uuidv4().substring(0, 8)}`,
                    client_id: CLIENT_ID,
                    driver_id: DRIVER_IDS[j % DRIVER_IDS.length],
                    assigned_by: ADMIN_ID,
                    pickup_address: { city: 'Dubai', area: 'JLT' },
                    delivery_address: { city: 'Dubai', area: 'Downtown' },
                    customer_name: `Customer M${i}${j}`,
                    customer_phone: `971501111${i}${j}`,
                    cod_amount: Math.floor(Math.random() * 500) + 100,
                    order_value: Math.floor(Math.random() * 1000) + 500,
                    delivery_fee: Math.floor(Math.random() * 50) + 20,
                    status: 'delivered',
                    created_at: date.toISOString(),
                    timeline: JSON.stringify([{ status: 'delivered', timestamp: date.toISOString() }])
                });
            }
        }

        for (const order of orders) {
            const query = `
                INSERT INTO orders (
                    tracking_id, client_id, driver_id, assigned_by, pickup_address, delivery_address, 
                    customer_name, customer_phone, cod_amount, order_value, delivery_fee, status, created_at, timeline
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            `;
            const values = [
                order.tracking_id, order.client_id, order.driver_id, order.assigned_by,
                JSON.stringify(order.pickup_address), JSON.stringify(order.delivery_address),
                order.customer_name, order.customer_phone, order.cod_amount,
                order.order_value, order.delivery_fee, order.status, order.created_at, order.timeline
            ];
            await db.query(query, values);
        }

        console.log(`Successfully seeded ${orders.length} orders.`);
        process.exit(0);
    } catch (err) {
        console.error('Error seeding orders:', err);
        process.exit(1);
    }
}

seedOrders();
