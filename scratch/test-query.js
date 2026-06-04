const db = require('../src/config/db');

async function test() {
    try {
        const availableDriverIds = ['03612606-5136-4b36-9fe7-5b749a64a914', 'cbe2a8fc-5972-4042-ae2e-0ad677258193'];
        
        // 1. Check if the users exist with the given IDs, role, and active status
        const users = await db.query(
            "SELECT id, name, role, active FROM users WHERE id = ANY($1::uuid[])",
            [availableDriverIds]
        );
        console.log('1. Users in DB with these IDs:', users.rows);

        // 2. Check the active orders matching the exclude subquery
        const subqueryResult = await db.query(
            `SELECT DISTINCT driver_id, status 
             FROM orders 
             WHERE driver_id IS NOT NULL 
               AND UPPER(status) IN ('ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'PICKED-UP', 'IN-TRANSIT')`
        );
        console.log('2. Excluded driver IDs & statuses from orders:', subqueryResult.rows);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

test();
