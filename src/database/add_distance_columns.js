const { Pool } = require('pg');

const connectionString = process.env.DB_URL;
const pool = new Pool({
    connectionString,
    user: !connectionString ? process.env.DB_USER : undefined,
    host: !connectionString ? process.env.DB_HOST : undefined,
    database: !connectionString ? process.env.DB_NAME : undefined,
    password: !connectionString ? process.env.DB_PASSWORD : undefined,
    port: !connectionString ? process.env.DB_PORT : undefined,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function run() {
    try {
        console.log('Running scratch migration to add distance columns to users table...');
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS included_distance DECIMAL(10, 2) DEFAULT 5.00,
            ADD COLUMN IF NOT EXISTS extra_distance_fee DECIMAL(14, 2) DEFAULT 2.00;
        `);
        console.log('Columns included_distance and extra_distance_fee added successfully.');
        
        console.log('Updating default values of included_distance (5) and extra_distance_fee (2) for existing clients...');
        await pool.query(`
            UPDATE users 
            SET included_distance = CASE WHEN included_distance = 0 OR included_distance IS NULL THEN 5.00 ELSE included_distance END, 
                extra_distance_fee = CASE WHEN extra_distance_fee = 0 OR extra_distance_fee IS NULL THEN 2.00 ELSE extra_distance_fee END 
            WHERE LOWER(role) = 'client';
        `);
        console.log('Existing client records updated successfully.');
    } catch (err) {
        console.error('Scratch migration failed:', err);
    } finally {
        await pool.end();
    }
}

run();
