const app = require('./app');
const autoAssignDriver = require('./modules/driver-assignment/auto-assign');

const PORT = process.env.PORT || 5000;


const server = app.listen(PORT, () => {
    console.log(`[SUCCESS] Server is listening on port ${PORT}`);
    // Start the driver auto-assignment worker
    autoAssignDriver().catch(err => {
        console.error('Failed to start driver auto-assignment worker:', err);
    });
});

// Keep-alive interval to prevent process from exiting if event loop is empty
const keepAlive = setInterval(() => {
    // This just keeps the event loop active
}, 10000);

server.on('close', () => {
    console.log('[WARN] Server is closing!');
    clearInterval(keepAlive);
});

server.on('error', (err) => {
    console.error('[ERROR] Server Error:', err);
    if (err.code === 'EADDRINUSE') {
        console.error(`[ERROR] Port ${PORT} is already in use.`);
    }
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    console.error('[CRITICAL] Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
    console.error('[CRITICAL] Uncaught Exception:', err);
    process.exit(1);
});

process.on('exit', (code) => {
    console.log(`[EXIT] Process exiting with code: ${code}`);
});

console.log('Finished executing server.js script');
