const { PgBoss } = require('pg-boss');

const boss = new PgBoss({
    connectionString: process.env.DB_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

boss.on('error', error => console.error('PgBoss error:', error));

let isStarted = false;
const startBoss = async () => {
    if (!isStarted) {
        await boss.start();
        isStarted = true;
        console.log('PgBoss queue service started successfully');
    }
    return boss;
};

// Start automatically
startBoss()
    .then(async (b) => {
        try {
            await b.createQueue('vehicle.status');
            await b.createQueue('order.created');
        } catch (e) {
            console.warn('PgBoss queues initialization warning:', e.message);
        }
    })
    .catch(err => console.error('Failed to start pg-boss:', err));

const publishJob = async (queueName, data, options = {}) => {
    const b = await startBoss();
    return await b.send(queueName, data, options);
};

const subscribeJob = async (queueName, handler) => {
    const b = await startBoss();
    return await b.work(queueName, async (jobs) => {
        try {
            const job = Array.isArray(jobs) ? jobs[0] : jobs;
            await handler(job ? job.data : undefined);
        } catch (err) {
            console.error(`Error processing job from queue ${queueName}:`, err);
            throw err;
        }
    });
};

module.exports = {
    publishJob,
    subscribeJob,
    boss
};
