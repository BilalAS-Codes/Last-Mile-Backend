require('dotenv').config();
const { pool } = require('../src/config/db');

async function createTransactionsTable() {
    try {
        console.log("Creating wallet_transactions table...");
        
        const query = `
            CREATE TABLE IF NOT EXISTS wallet_transactions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                amount NUMERIC(10, 2) NOT NULL,
                type VARCHAR(50) NOT NULL, 
                order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
                settlement_id UUID REFERENCES settlements(id) ON DELETE SET NULL,
                admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
                balance_after NUMERIC(10, 2),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;
        
        await pool.query(query);
        console.log("Table created successfully!");
    } catch (err) {
        console.error("Error creating table:", err);
    } finally {
        pool.end();
    }
}

createTransactionsTable();
