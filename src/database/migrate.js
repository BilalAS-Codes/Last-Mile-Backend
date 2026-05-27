const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

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

const schemaSql = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    avatar VARCHAR(255) NULL,
    phone VARCHAR(255) NULL,
    vehicle_number VARCHAR(255) NULL,
    vehicle_type VARCHAR(255) NULL,
    rating DECIMAL(3, 2) DEFAULT 5.00,
    cash_in_hand DECIMAL(14, 2) DEFAULT 0.00,
    company_details JSONB NULL,
    otp VARCHAR(255) NULL,
    otp_expiry TIMESTAMP NULL,
    fee_type VARCHAR(50) DEFAULT 'fixed',
    fee_value DECIMAL(14, 2) DEFAULT 0.00,
    included_distance DECIMAL(10, 2) DEFAULT 5.00,
    extra_distance_fee DECIMAL(14, 2) DEFAULT 2.00,
    pending_settlement_balance DECIMAL(12, 2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'SAR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES users(id) ON DELETE CASCADE,
    total_amount DECIMAL(14, 2) NOT NULL,
    outstanding_balance DECIMAL(14, 2) DEFAULT 0.00,
    due_date TIMESTAMP NULL,
    status VARCHAR(50) DEFAULT 'UNPAID',
    billing_period VARCHAR(255) NULL,
    orders JSONB DEFAULT '[]',
    extra_charges DECIMAL(14, 2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'SAR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_id VARCHAR(255) UNIQUE NOT NULL,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES users(id) ON DELETE SET NULL NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    order_value DECIMAL(14, 2) DEFAULT 0.00,
    cod_amount DECIMAL(14, 2) DEFAULT 0.00,
    delivery_fee DECIMAL(14, 2) DEFAULT 0.00,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(255) NOT NULL,
    pickup_address JSONB NOT NULL,
    delivery_address JSONB NOT NULL,
    timeline JSONB DEFAULT '[]',
    cod_collected BOOLEAN DEFAULT FALSE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL NULL,
    currency VARCHAR(10) DEFAULT 'SAR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Orders
CREATE INDEX IF NOT EXISTS idx_orders_invoice_id ON orders(invoice_id) WHERE invoice_id IS NULL;

-- Create Settlements table
CREATE TABLE IF NOT EXISTS settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(14, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL NULL,
    currency VARCHAR(10) DEFAULT 'SAR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Driver Locations table
CREATE TABLE IF NOT EXISTS driver_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_created_at ON driver_locations(created_at);

-- Create Refresh Tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    last_active_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

async function runMigration() {
    try {
        console.log('Starting custom database migration...');
        await pool.query(schemaSql);
        console.log('Database tables created successfully (or already existed).');

        // Check if admin user already exists
        const adminEmail = 'bilalahmsiddique@gmail.com';
        const res = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);

        if (res.rowCount === 0) {
            console.log('Seeding dummy admin user...');
            const hashedPassword = await bcrypt.hash('Test@123', 10);
            await pool.query(
                `INSERT INTO users (name, email, password, role, active) 
                 VALUES ($1, $2, $3, $4, $5)`,
                ['Bilal Admin', adminEmail, hashedPassword, 'admin', true]
            );
            console.log('Dummy admin user seeded successfully.');
        } else {
            console.log('Dummy admin user already exists.');
        }
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
