const db = require('../src/config/db');

async function run() {
    try {
        const driverId = 'e5a3cb75-8171-4b30-8fd8-c4b4a8bb7a62';
        
        console.log('--- CHECKING DRIVER ZONES ---');
        const dz = await db.query('SELECT * FROM driver_zones WHERE driver_id = $1', [driverId]);
        console.log('Driver zones count:', dz.rowCount);
        console.log('Driver zones:', dz.rows);

        console.log('\n--- CHECKING PENDING ORDERS ---');
        const orders = await db.query("SELECT id, tracking_id, zone_id, status FROM orders WHERE UPPER(status) = 'PENDING'");
        console.log('Pending orders:', orders.rows);
    } catch(e) {
        console.error(e);
    } finally {
        db.pool.end();
    }
}

run();
