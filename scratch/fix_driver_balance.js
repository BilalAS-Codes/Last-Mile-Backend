require('dotenv').config();
const { pool } = require('../src/config/db');

const driverId = '03612606-5136-4b36-9fe7-5b749a64a914';

async function fixDriverBalance() {
    try {
        console.log(`Fixing balance for driver: ${driverId}`);
        
        // 1. Total COD Collected (Delivered orders)
        const ordersRes = await pool.query(
            "SELECT SUM(cod_amount) as total FROM orders WHERE driver_id = $1 AND LOWER(status) = 'delivered' AND cod_collected = TRUE",
            [driverId]
        );
        const totalCollected = parseFloat(ordersRes.rows[0].total || 0);
        console.log(`Total COD Collected: ${totalCollected}`);

        // 2. Total Approved Settlements
        const approvedRes = await pool.query(
            "SELECT SUM(amount) as total FROM settlements WHERE driver_id = $1 AND LOWER(status) = 'approved'",
            [driverId]
        );
        const totalApproved = parseFloat(approvedRes.rows[0].total || 0);
        console.log(`Total Approved Settlements: ${totalApproved}`);

        // 3. Total Pending Settlements
        const pendingRes = await pool.query(
            "SELECT SUM(amount) as total FROM settlements WHERE driver_id = $1 AND LOWER(status) = 'pending'",
            [driverId]
        );
        const totalPending = parseFloat(pendingRes.rows[0].total || 0);
        console.log(`Total Pending Settlements: ${totalPending}`);

        // Calculate available cash in hand
        // According to our new logic: cash_in_hand is NET available.
        // So cash_in_hand = TotalCollected - TotalApproved - TotalPending
        const finalCashInHand = totalCollected - totalApproved - totalPending;
        const finalPendingBalance = totalPending;

        console.log(`Calculated Cash in Hand (Net): ${finalCashInHand}`);
        console.log(`Calculated Pending Balance: ${finalPendingBalance}`);

        // 4. Update the user
        const updateRes = await pool.query(
            "UPDATE users SET cash_in_hand = $1, pending_settlement_balance = $2 WHERE id = $3 RETURNING *",
            [finalCashInHand, finalPendingBalance, driverId]
        );

        if (updateRes.rows.length > 0) {
            console.log("Update successful!");
            console.log(JSON.stringify(updateRes.rows[0], null, 2));
        } else {
            console.log("User not found or update failed.");
        }

    } catch (err) {
        console.error("Error fixing balance:", err);
    } finally {
        pool.end();
    }
}

fixDriverBalance();
