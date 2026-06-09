process.env.DB_URL = process.env.DB_URL || 'postgresql://postgres:postgres@localhost:5432/lastmile';

const zoneService = require('../src/modules/zones/zone.service');
const orderService = require('../src/modules/orders/order.service');
const batchService = require('../src/modules/zones/batch.service');
const db = require('../src/config/db');

async function testBatches() {
    console.log('--- STARTING ORDER BATCHING/CLUBBING TESTS ---');
    try {
        // Clean up tables (Disabled to preserve existing database data)
        console.log('Skipping database cleanup to preserve existing data...');

        // 1. Create or reuse a zone
        console.log('Setting up Test Zone...');
        const coords = [
            [39.15, 21.45],
            [39.25, 21.45],
            [39.25, 21.55],
            [39.15, 21.55],
            [39.15, 21.45]
        ];
        
        let testZone;
        const existingZoneRes = await db.query("SELECT * FROM zones WHERE name = 'Test Zone A' LIMIT 1");
        if (existingZoneRes.rows.length > 0) {
            testZone = existingZoneRes.rows[0];
            console.log(`Using existing zone: ${testZone.name} with ID: ${testZone.id}`);
        } else {
            testZone = await zoneService.createZone({
                name: 'Test Zone A',
                coordinates: coords
            });
            console.log(`Created zone: ${testZone.name} with ID: ${testZone.id}`);
        }

        // Fetch client ID
        const clientRes = await db.query("SELECT id FROM users WHERE email = 'bilalahmsiddique@gmail.com' LIMIT 1");
        const clientId = clientRes.rows[0].id;

        // 2. Create 3 orders close to each other (should club)
        console.log('Creating 3 close orders...');
        const o1 = await orderService.createOrder(clientId, {
            customer_name: 'Customer A1',
            customer_phone: '+966500000001',
            pickup_address: { address: 'Warehouse 1', lat: 21.48, long: 39.20 },
            delivery_address: { address: 'Delivery 1', lat: 21.50, long: 39.22 },
            order_value: 100,
            delivery_fee: 10,
            cod_amount: 100
        });

        const o2 = await orderService.createOrder(clientId, {
            customer_name: 'Customer A2',
            customer_phone: '+966500000002',
            pickup_address: { address: 'Warehouse 1', lat: 21.481, long: 39.201 }, // extremely close
            delivery_address: { address: 'Delivery 2', lat: 21.502, long: 39.222 }, // extremely close
            order_value: 120,
            delivery_fee: 10,
            cod_amount: 120
        });

        const o3 = await orderService.createOrder(clientId, {
            customer_name: 'Customer A3',
            customer_phone: '+966500000003',
            pickup_address: { address: 'Warehouse 1', lat: 21.482, long: 39.202 }, // extremely close
            delivery_address: { address: 'Delivery 3', lat: 21.503, long: 39.223 }, // extremely close
            order_value: 130,
            delivery_fee: 10,
            cod_amount: 130
        });

        // 3. Create 1 order far away (should not club)
        console.log('Creating 1 far order...');
        const oFar = await orderService.createOrder(clientId, {
            customer_name: 'Customer Far',
            customer_phone: '+966500000004',
            pickup_address: { address: 'Far Warehouse', lat: 21.54, long: 39.24 }, // still in zone but far
            delivery_address: { address: 'Far Delivery', lat: 21.46, long: 39.16 }, // far
            order_value: 90,
            delivery_fee: 25,
            cod_amount: 0
        });

        console.log('Created orders:');
        console.log(`- Order 1: Zone: ${o1.zone_id}, Status: ${o1.status}`);
        console.log(`- Order 2: Zone: ${o2.zone_id}, Status: ${o2.status}`);
        console.log(`- Order 3: Zone: ${o3.zone_id}, Status: ${o3.status}`);
        console.log(`- Order Far: Zone: ${oFar.zone_id}, Status: ${oFar.status}`);

        // 4. Trigger auto-clubbing
        console.log('Running autoClubOrders...');
        const clubbedBatches = await batchService.autoClubOrders();
        console.log(`Created ${clubbedBatches.length} batches.`);

        for (const b of clubbedBatches) {
            console.log(`Batch Code: ${b.batch.batch_code}, Total Orders: ${b.batch.total_orders}`);
            console.log('Orders in batch:', b.orders.map(o => o.tracking_id));
        }

        // 5. Test manual batch creation
        console.log('Testing manual batch creation...');
        // Let's reset the batch_id of the orders first so we can batch them manually
        await db.query('UPDATE orders SET batch_id = NULL');
        
        const manualBatchRes = await batchService.createManualBatch([o1.id, o2.id]);
        console.log(`Created manual batch: ${manualBatchRes.batch.batch_code} containing orders: ${manualBatchRes.orders.map(o => o.tracking_id)}`);

        // 6. Test driver assignment
        console.log('Testing driver assignment...');
        const driverRes = await db.query("SELECT id FROM users LIMIT 1");
        const driverId = driverRes.rows[0].id;

        const assignmentRes = await batchService.assignDriverToBatch(manualBatchRes.batch.id, driverId, clientId);
        console.log(`Batch ${assignmentRes.batch.batch_code} status updated to: ${assignmentRes.batch.status}, Driver ID: ${assignmentRes.batch.driver_id}`);
        
        // Verify orders updated
        const verifyOrdersResult = await db.query('SELECT id, tracking_id, driver_id, status FROM orders WHERE batch_id = $1', [manualBatchRes.batch.id]);
        console.log('Orders inside assigned batch in DB:');
        for (const order of verifyOrdersResult.rows) {
            console.log(`- Order: ${order.tracking_id}, Status: ${order.status}, Driver ID: ${order.driver_id}`);
        }

        console.log('--- ALL BATCHING TESTS PASSED ---');
    } catch (err) {
        console.error('Test failed with error:', err);
    } finally {
        await db.pool.end();
    }
}

testBatches();
