const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../src/config/db');

async function normalizeData() {
    try {
        console.log('Normalizing database roles and statuses to lowercase...');

        // 1. Update User Roles
        const userRes = await db.query('UPDATE users SET role = LOWER(role) RETURNING id, role');
        console.log(`Updated ${userRes.rowCount} users roles to lowercase.`);

        // 2. Update Order Statuses
        const orderRes = await db.query('UPDATE orders SET status = LOWER(status) RETURNING id, status');
        console.log(`Updated ${orderRes.rowCount} orders statuses to lowercase.`);

        // 3. Update Order Timeline statuses (JSONB)
        // This is a bit more complex since it's an array of objects
        const timelineRes = await db.query(`
            UPDATE orders 
            SET timeline = (
                SELECT jsonb_agg(
                    jsonb_set(elem, '{status}', to_jsonb(LOWER(elem->>'status')))
                )
                FROM jsonb_array_elements(timeline) elem
            )
            WHERE timeline IS NOT NULL AND jsonb_array_length(timeline) > 0
            RETURNING id
        `);
        console.log(`Updated timelines for ${timelineRes.rowCount} orders.`);

        // 4. Update Settlement Statuses
        try {
            const settlementRes = await db.query('UPDATE settlements SET status = LOWER(status) RETURNING id, status');
            console.log(`Updated ${settlementRes.rowCount} settlements statuses to lowercase.`);
        } catch (e) {
            console.log('Settlements table might not exist or empty, skipping.');
        }

        // 5. Update Invoice Statuses
        try {
            const invoiceRes = await db.query('UPDATE invoices SET status = LOWER(status) RETURNING id, status');
            console.log(`Updated ${invoiceRes.rowCount} invoices statuses to lowercase.`);
        } catch (e) {
            console.log('Invoices table might not exist or empty, skipping.');
        }

        // 6. Update Fee Type in users
        const feeRes = await db.query('UPDATE users SET fee_type = LOWER(fee_type) WHERE fee_type IS NOT NULL RETURNING id');
        console.log(`Updated ${feeRes.rowCount} users fee types to lowercase.`);

        console.log('Normalization complete.');
        process.exit(0);
    } catch (err) {
        console.error('Error normalizing data:', err);
        process.exit(1);
    }
}

normalizeData();
