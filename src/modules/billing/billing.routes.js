const express = require('express');
const router = express.Router();
const billingController = require('./billing.controller');
const validate = require('../../middleware/validate.middleware');
const { generateInvoiceSchema } = require('./billing.validation');
const { protect, authorize } = require('../../middleware/auth.middleware');

router.post('/generate', protect, authorize('Admin'), validate(generateInvoiceSchema), billingController.generate);
router.get('/', protect, authorize('Admin'), billingController.listInvoices);
router.get('/my-invoices', protect, authorize('Client'), billingController.getMyInvoices);
router.get('/client/:clientId', protect, authorize('Admin'), billingController.getClientInvoices);
router.get('/revenue-stats', protect, authorize('Admin'), billingController.getRevenueStats);

module.exports = router;
