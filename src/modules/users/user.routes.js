const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const validate = require('../../middleware/validate.middleware');
const { updateDriverStatusSchema } = require('./user.validation');
const { protect, authorize } = require('../../middleware/auth.middleware');

router.get('/', protect, userController.listUsers);
router.get('/drivers', protect, userController.listDrivers);
router.put('/drivers/:id/status', protect, authorize('Admin', 'Driver'), validate(updateDriverStatusSchema), userController.updateDriverStatus);

module.exports = router;
