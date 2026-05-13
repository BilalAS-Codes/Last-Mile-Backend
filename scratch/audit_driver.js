require('dotenv').config();
const { pool } = require('../src/config/db');

async function auditData() {
    try {
        const driverId = '03612606-5136-4b36-9fe7-5b749a64a914';
        
        console.log("--- Audit for Sameer ---");
        
        const orders = await pool.query("SELECT id, status, cod_amount, cod_collected FROM orders WHERE driver_id = $1", [driverId]);
        console.log(`Total Orders: ${orders.rows.length}`);
        orders.rows.forEach(o => {
            console.log(`Order: status=${o.status}, cod_amount=${o.cod_amount}, cod_collected=${o.cod_collected}`);
        });

        const settlements = await pool.query("SELECT id, status, amount FROM settlements WHERE driver_id = $1", [driverId]);
        console.log(`Total Settlements: ${settlements.rows.length}`);
        settlements.rows.forEach(s => {
            console.log(`Settlement: status=${s.status}, amount=${s.amount}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

auditData();
