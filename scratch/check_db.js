const db = require('../src/config/db');

async function check() {
    const tables = ['users', 'orders', 'invoices', 'settlements'];
    for (const t of tables) {
        const res = await db.query(
            "SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = $1 AND column_name = 'currency'",
            [t]
        );
        console.log(t, 'currency column:', res.rows);
    }
    process.exit(0);
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
