require('dotenv').config();
const { pool } = require('../src/config/db');

async function backfillTransactions() {
    try {
        console.log("Starting backfill of wallet_transactions...");
        
        // 1. Clear existing transactions (if any) to avoid duplicates
        await pool.query("DELETE FROM wallet_transactions");
        console.log("Cleared existing transactions.");

        // 2. Fetch all relevant data
        const ordersRes = await pool.query(
            "SELECT id, driver_id, cod_amount, created_at FROM orders WHERE LOWER(status) = 'delivered' AND cod_collected = TRUE"
        );
        
        const settlementsRes = await pool.query(
            "SELECT id, driver_id, amount, status, admin_id, created_at, updated_at FROM settlements"
        );

        // 3. Combine events
        const events = [];

        ordersRes.rows.forEach(order => {
            events.push({
                type: 'collection',
                driver_id: order.driver_id,
                amount: parseFloat(order.cod_amount),
                order_id: order.id,
                created_at: order.created_at
            });
        });

        settlementsRes.rows.forEach(s => {
            // Every settlement starts with a request (Negative)
            events.push({
                type: 'settlement_request',
                driver_id: s.driver_id,
                amount: -parseFloat(s.amount),
                settlement_id: s.id,
                created_at: s.created_at
            });

            // If it was approved, add an approval record (Zero impact on available balance)
            if (s.status.toLowerCase() === 'approved') {
                events.push({
                    type: 'settlement_approved',
                    driver_id: s.driver_id,
                    amount: 0,
                    settlement_id: s.id,
                    admin_id: s.admin_id,
                    created_at: s.updated_at || s.created_at // Use updated_at if available
                });
            }

            // If it was rejected, add a rejection record (Positive refund)
            if (s.status.toLowerCase() === 'rejected') {
                events.push({
                    type: 'settlement_rejected',
                    driver_id: s.driver_id,
                    amount: parseFloat(s.amount),
                    settlement_id: s.id,
                    admin_id: s.admin_id,
                    created_at: s.updated_at || s.created_at
                });
            }
        });

        // 4. Sort by date globally
        events.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        // 5. Group by driver and process
        const drivers = {};
        
        for (const event of events) {
            if (!event.driver_id) continue;
            
            if (!drivers[event.driver_id]) {
                drivers[event.driver_id] = { balance: 0 };
            }
            
            drivers[event.driver_id].balance += event.amount;
            
            const insertQuery = `
                INSERT INTO wallet_transactions 
                (driver_id, amount, type, order_id, settlement_id, admin_id, balance_after, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `;
            
            await pool.query(insertQuery, [
                event.driver_id,
                event.amount,
                event.type,
                event.order_id || null,
                event.settlement_id || null,
                event.admin_id || null,
                drivers[event.driver_id].balance,
                event.created_at
            ]);
        }

        console.log("Backfill completed successfully!");
        
        // Print some stats
        for (const [id, data] of Object.entries(drivers)) {
            console.log(`Driver ${id}: Final Available Balance = $${data.balance.toFixed(2)}`);
        }

    } catch (err) {
        console.error("Error during backfill:", err);
    } finally {
        pool.end();
    }
}

backfillTransactions();
