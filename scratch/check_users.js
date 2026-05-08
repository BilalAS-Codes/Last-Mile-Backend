const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../src/config/db');

async function checkUsers() {
    try {
        const drivers = await db.query("SELECT id, name, role FROM users WHERE LOWER(role) = 'driver' LIMIT 5");
        const admins = await db.query("SELECT id, name, role FROM users WHERE LOWER(role) = 'admin' LIMIT 5");
        const clients = await db.query("SELECT id, name, role FROM users WHERE LOWER(role) = 'client' LIMIT 5");

        console.log('--- Drivers ---');
        console.table(drivers.rows);
        console.log('--- Admins ---');
        console.table(admins.rows);
        console.log('--- Clients ---');
        console.table(clients.rows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkUsers();
