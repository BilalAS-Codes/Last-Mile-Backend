const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middleware/error.middleware');

const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');

// Route imports
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/user.routes');
const orderRoutes = require('./modules/orders/order.routes');
const walletRoutes = require('./modules/wallet/wallet.routes');
const billingRoutes = require('./modules/billing/billing.routes');
const cashflowRoutes = require('./modules/cashflow/cashflow.routes');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/cashflow', cashflowRoutes);

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Error Handling
app.use(errorHandler);

module.exports = app;
