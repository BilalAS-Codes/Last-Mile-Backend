const repository = require('./notification.repository');
const { sendSuccess } = require('../../utils/response');

const getNotifications = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        
        const notifications = await repository.getUserNotifications(userId, limit, offset);
        sendSuccess(res, 200, 'Notifications fetched successfully', notifications);
    } catch (error) {
        next(error);
    }
};

const getUnreadCount = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const count = await repository.getUnreadCount(userId);
        sendSuccess(res, 200, 'Unread notification count fetched successfully', { count });
    } catch (error) {
        next(error);
    }
};

const markAsRead = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const notification = await repository.markAsRead(id, userId);
        
        if (!notification) {
            const error = new Error('Notification not found or access denied');
            error.statusCode = 404;
            throw error;
        }
        
        sendSuccess(res, 200, 'Notification marked as read successfully', notification);
    } catch (error) {
        next(error);
    }
};

const markAllAsRead = async (req, res, next) => {
    try {
        const userId = req.user.id;
        await repository.markAllAsRead(userId);
        sendSuccess(res, 200, 'All notifications marked as read successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead
};
