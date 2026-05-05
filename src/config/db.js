const { Pool } = require('pg');


const pool = new Pool({
    connectionString: process.env.DB_URL,
    user: !process.env.DB_URL ? process.env.DB_USER : undefined,
    host: !process.env.DB_URL ? process.env.DB_HOST : undefined,
    database: !process.env.DB_URL ? process.env.DB_NAME : undefined,
    password: !process.env.DB_URL ? process.env.DB_PASSWORD : undefined,
    port: !process.env.DB_URL ? process.env.DB_PORT : undefined,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => {
    console.log('Successfully connected to the database');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};
