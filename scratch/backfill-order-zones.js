const db = require('../src/config/db');
const zoneService = require('../src/modules/zones/zone.service');

async function run() {
    try {
        console.log('Fetching pending orders with null zone_id...');
        const res = await db.query("SELECT id, pickup_address, tracking_id FROM orders WHERE zone_id IS NULL AND UPPER(status) = 'PENDING'");
        console.log(`Found ${res.rowCount} orders to process.`);

        for (const order of res.rows) {
            let pickup = order.pickup_address;
            if (typeof pickup === 'string') {
                try { pickup = JSON.parse(pickup); } catch(e) {}
            }
            if (pickup && pickup.lat && pickup.long) {
                const zone = await zoneService.findZoneForCoordinates(parseFloat(pickup.lat), parseFloat(pickup.long));
                if (zone) {
                    await db.query("UPDATE orders SET zone_id = $1 WHERE id = $2", [zone.id, order.id]);
                    console.log(`Updated order ${order.id} (${order.tracking_id}) with zone "${zone.name}" (${zone.id})`);
                } else {
                    console.log(`Could not find zone for order ${order.id} (${order.tracking_id}) coordinates: [${pickup.lat}, ${pickup.long}]`);
                }
            }
        }
        console.log('Backfill complete!');
    } catch (e) {
        console.error(e);
    } finally {
        db.pool.end();
    }
}

run();
