require('dotenv').config();
const { pool } = require('../src/config/db');

async function syncUserBalances() {
    try {
        console.log("Syncing users table with orders and settlements...");
        
        // 1. Fetch all drivers
        const usersRes = await pool.query("SELECT id, name FROM users WHERE LOWER(role) = 'driver'");
        const drivers = usersRes.rows;
        console.log(`Found ${drivers.length} drivers.`);

        for (const driver of drivers) {
            console.log(`\nProcessing ${driver.name} (${driver.id})...`);

            // A. Total COD Collected (Delivered)
            const collectionRes = await pool.query(
                "SELECT SUM(cod_amount) as total FROM orders WHERE driver_id = $1 AND LOWER(status) = 'delivered' AND cod_collected = TRUE",
                [driver.id]
            );
            const totalCollected = parseFloat(collectionRes.rows[0].total || 0);

            // B. Total Approved Settlements (Money already gone)
            const approvedRes = await pool.query(
                "SELECT SUM(amount) as total FROM settlements WHERE driver_id = $1 AND LOWER(status) = 'approved'",
                [driver.id]
            );
            const totalApproved = parseFloat(approvedRes.rows[0].total || 0);

            // C. Total Pending Settlements (Locked money)
            const pendingRes = await pool.query(
                "SELECT SUM(amount) as total FROM settlements WHERE driver_id = $1 AND LOWER(status) = 'pending'",
                [driver.id]
            );
            const totalPending = parseFloat(pendingRes.rows[0].total || 0);

            // Calculate Net Available Balance
            const availableCash = totalCollected - totalApproved - totalPending;
            
            console.log(` - Total Collected: $${totalCollected.toFixed(2)}`);
            console.log(` - Total Approved: $${totalApproved.toFixed(2)}`);
            console.log(` - Total Pending: $${totalPending.toFixed(2)}`);
            console.log(` - => New cash_in_hand (Available): $${availableCash.toFixed(2)}`);
            console.log(` - => New pending_settlement_balance: $${totalPending.toFixed(2)}`);

            // Update user record
            await pool.query(
                "UPDATE users SET cash_in_hand = $1, pending_settlement_balance = $2 WHERE id = $3",
                [availableCash, totalPending, driver.id]
            );
        }

        console.log("\nSync completed successfully!");

    } catch (err) {
        console.error("Error during balance sync:", err);
    } finally {
        pool.end();
    }
}

syncUserBalances();
