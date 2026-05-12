require('dotenv').config();
const { pool } = require('../src/config/db');

const driverId = '03612606-5136-4b36-9fe7-5b749a64a914';

async function generateStatement() {
    try {
        console.log(`--- Driver Statement for Sameer (${driverId}) ---`);
        
        // 1. Delivered Orders
        console.log('\n[Delivered COD Orders]');
        const ordersRes = await pool.query(
            "SELECT tracking_id, cod_amount, created_at FROM orders WHERE driver_id = $1 AND LOWER(status) = 'delivered' AND cod_collected = TRUE ORDER BY created_at ASC",
            [driverId]
        );
        
        let totalCollected = 0;
        ordersRes.rows.forEach(order => {
            console.log(`${order.created_at.toISOString().split('T')[0]} | ${order.tracking_id} | Amount: $${parseFloat(order.cod_amount).toFixed(2)}`);
            totalCollected += parseFloat(order.cod_amount);
        });
        console.log(`Total Collected: $${totalCollected.toFixed(2)}`);

        // 2. Settlements
        console.log('\n[Settlements]');
        const settlementsRes = await pool.query(
            "SELECT id, amount, status, created_at FROM settlements WHERE driver_id = $1 ORDER BY created_at ASC",
            [driverId]
        );
        
        let totalApproved = 0;
        let totalPending = 0;
        settlementsRes.rows.forEach(s => {
            const amount = parseFloat(s.amount);
            console.log(`${s.created_at.toISOString().split('T')[0]} | ID: ${s.id.substring(0,8)}... | Status: ${s.status} | Amount: $${amount.toFixed(2)}`);
            if (s.status.toLowerCase() === 'approved') totalApproved += amount;
            if (s.status.toLowerCase() === 'pending') totalPending += amount;
        });
        
        console.log(`Total Approved: $${totalApproved.toFixed(2)}`);
        console.log(`Total Pending: $${totalPending.toFixed(2)}`);

        // 3. Final Calculation
        console.log('\n[Final Summary]');
        console.log(`Opening Balance: $0.00`);
        console.log(`(+) Total COD Collected: $${totalCollected.toFixed(2)}`);
        console.log(`(-) Total Approved Settlements: $${totalApproved.toFixed(2)}`);
        console.log(`(-) Total Pending Settlements (Locked): $${totalPending.toFixed(2)}`);
        console.log(`(=) Net Cash in Hand (Available): $${(totalCollected - totalApproved - totalPending).toFixed(2)}`);

    } catch (err) {
        console.error("Error generating statement:", err);
    } finally {
        pool.end();
    }
}

generateStatement();
