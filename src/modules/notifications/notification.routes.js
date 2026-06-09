const express = require('express');
const router = express.Router();
const controller = require('./notification.controller');
const { protect } = require('../../middleware/auth.middleware');

router.get('/', protect, controller.getNotifications);
router.get('/unread-count', protect, controller.getUnreadCount);
router.patch('/read-all', protect, controller.markAllAsRead);
router.patch('/:id/read', protect, controller.markAsRead);

module.exports = router;
