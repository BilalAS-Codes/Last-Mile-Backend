const app = require('./app');

const PORT = process.env.PORT || 5000;

console.log('Attempting to start server...');

const server = app.listen(PORT, () => {
    console.log(`[SUCCESS] Server is listening on port ${PORT}`);
    console.log(`[INFO] Node version: ${process.version}`);
    console.log(`[INFO] Environment: ${process.env.NODE_ENV}`);
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
