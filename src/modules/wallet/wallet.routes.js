const express = require('express');
const router = express.Router();
const walletController = require('./wallet.controller');
const validate = require('../../middleware/validate.middleware');
const { settleFundsSchema, approveSettlementSchema } = require('./wallet.validation');
const { protect, authorize } = require('../../middleware/auth.middleware');

router.get('/driver/:driverId', protect, walletController.getDriverWallet);
router.post('/settle', protect, authorize('Driver'), validate(settleFundsSchema), walletController.settle);
router.get('/settlements', protect, authorize('Admin'), walletController.listSettlements);
router.patch('/settlements/:id', protect, authorize('Admin'), validate(approveSettlementSchema), walletController.approve);

module.exports = router;
