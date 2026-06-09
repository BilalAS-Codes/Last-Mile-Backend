// Set environment variables for testing manually if needed
process.env.DB_URL = process.env.DB_URL || 'postgresql://postgres:postgres@localhost:5432/lastmile';

const zoneService = require('../src/modules/zones/zone.service');
const orderService = require('../src/modules/orders/order.service');
const db = require('../src/config/db');

async function runTests() {
    console.log('--- STARTING ZONE AND ROUTING TESTS ---');
    
    try {
        // Clear old test data
        console.log('Cleaning existing test zones...');
        await db.query('DELETE FROM driver_zones');
        await db.query('DELETE FROM orders');
        await db.query('DELETE FROM zones');

        // 1. Create Jeddah South Zone
        console.log('Creating Jeddah South Zone...');
        const jeddahSouthCoords = [
            [39.15, 21.45],
            [39.25, 21.45],
            [39.25, 21.55],
            [39.15, 21.55],
            [39.15, 21.45] // Closed
        ];
        const jeddahSouth = await zoneService.createZone({
            name: 'Jeddah South',
            coordinates: jeddahSouthCoords
        });
        console.log('Jeddah South created successfully! ID:', jeddahSouth.id);

        // 2. Try to create overlapping zone (Jeddah Central)
        console.log('Attempting to create overlapping Jeddah Central...');
        const overlappingCoords = [
            [39.20, 21.50],
            [39.30, 21.50],
            [39.30, 21.60],
            [39.20, 21.60],
            [39.20, 21.50] // Overlaps with Jeddah South
        ];
        
        try {
            await zoneService.createZone({
                name: 'Jeddah Central',
                coordinates: overlappingCoords
            });
            console.error('FAIL: Overlapping zone was created when it should have failed!');
        } catch (error) {
            console.log('SUCCESS: Overlap detected and rejected. Error message:', error.message);
        }

        // 3. Create non-overlapping zone (Riyadh North)
        console.log('Creating non-overlapping Riyadh North...');
        const riyadhCoords = [
            [46.60, 24.70],
            [46.70, 24.70],
            [46.70, 24.80],
            [46.60, 24.80],
            [46.60, 24.70]
        ];
        const riyadhNorth = await zoneService.createZone({
            name: 'Riyadh North',
            coordinates: riyadhCoords
        });
        console.log('Riyadh North created successfully! ID:', riyadhNorth.id);

        // 4. Point-in-Polygon validation
        console.log('Testing point inside Jeddah South (39.20, 21.48)...');
        const matchZone = await zoneService.findZoneForCoordinates(21.48, 39.20);
        if (matchZone && matchZone.name === 'Jeddah South') {
            console.log('SUCCESS: Point resolved to Jeddah South!');
        } else {
            console.error('FAIL: Point resolved to:', matchZone ? matchZone.name : 'null');
        }

        // 5. Test order creation routing
        console.log('Creating client user for order...');
        // Let's fetch the seeded admin email to use as client
        const clientRes = await db.query("SELECT id FROM users WHERE email = 'bilalahmsiddique@gmail.com' LIMIT 1");
        const clientId = clientRes.rows[0].id;

        console.log('Creating order with pickup inside Jeddah South...');
        const order = await orderService.createOrder(clientId, {
            customer_name: 'John Doe',
            customer_phone: '+966500000000',
            pickup_address: {
                address: 'Jeddah Port',
                lat: 21.48,
                long: 39.20
            },
            delivery_address: {
                address: 'Jeddah Corniche',
                lat: 21.52,
                long: 39.18
            },
            order_value: 150,
            delivery_fee: 10,
            cod_amount: 150
        });

        if (order.zone_id === jeddahSouth.id) {
            console.log('SUCCESS: Order successfully routed to Jeddah South! Zone ID:', order.zone_id);
        } else {
            console.error('FAIL: Order routed to incorrect zone ID:', order.zone_id);
        }

        console.log('--- ALL TESTS COMPLETED ---');
    } catch (e) {
        console.error('Error during tests:', e);
    } finally {
        await db.pool.end();
    }
}

runTests();
