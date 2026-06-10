const config = require('../src/config/assignment-config');
const db = require('../src/config/db');

async function run() {
    try {
        console.log('--- FETCHING CURRENT SETTINGS ---');
        const settings = await config.getSettings();
        console.log('Current Settings:', settings);

        console.log('\n--- UPDATING SETTINGS FOR ORDER CLUBBING ---');
        const updated = await config.updateSettings('fifo', true, 1.5, 5);
        console.log('Updated Settings Result:', updated);

        console.log('\n--- VERIFYING FROM DB ---');
        const dbRes = await db.query('SELECT * FROM assignment_settings ORDER BY created_at DESC LIMIT 1');
        console.log('Database Row:', dbRes.rows[0]);

        console.log('\n--- FETCHING AGAIN ---');
        const verified = await config.getSettings();
        console.log('Verified Settings:', verified);

        // Reset settings
        console.log('\n--- RESETTING SETTINGS TO DEFAULTS ---');
        const reset = await config.updateSettings('fifo', false, 1.0, 1.0);
        console.log('Reset Settings Result:', reset);

        console.log('\nVerification complete successfully!');
    } catch (e) {
        console.error('Verification failed:', e);
    } finally {
        // close DB pool to allow clean exit
        db.pool.end();
    }
}

run();
