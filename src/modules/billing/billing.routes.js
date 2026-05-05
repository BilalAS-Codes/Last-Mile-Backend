const express = require('express');
const router = express.Router();
const billingController = require('./billing.controller');
const validate = require('../../middleware/validate.middleware');
const { generateInvoiceSchema } = require('./billing.validation');
const { protect, authorize } = require('../../middleware/auth.middleware');

router.post('/generate', protect, authorize('admin'), validate(generateInvoiceSchema), billingController.generate);
router.get('/', protect, authorize('admin'), billingController.listInvoices);
router.get('/my-invoices', protect, authorize('client'), billingController.getMyInvoices);
router.get('/client/:clientId', protect, authorize('admin'), billingController.getClientInvoices);
router.get('/revenue-stats', protect, authorize('admin'), billingController.getRevenueStats);

module.exports = router;
