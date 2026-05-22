const orderService = require('./order.service');
const { sendSuccess } = require('../../utils/response');

const create = async (req, res, next) => {
    try {
        const order = await orderService.createOrder(req.user.id, req.body);
        
        sendSuccess(res, 201, 'Order created successfully', order);
    } catch (err) {
        next(err);
    }
};

const bulkCreate = async (req, res, next) => {
    try {
        if (!req.file) {
            const error = new Error('Please upload a CSV file');
            error.statusCode = 400;
            throw error;
        }
        const result = await orderService.bulkCreateOrders(req.user.id, req.file.buffer);
        sendSuccess(res, 201, result.message || 'Orders created successfully', result);
    } catch (err) {
        next(err);
    }
};

const list = async (req, res, next) => {
    try {
        const filters = req.query;
        const userRole = req.user.role.toLowerCase();
        if (userRole === 'client') filters.client_id = req.user.id;
        if (userRole === 'driver') filters.driver_id = req.user.id;

        const orders = await orderService.getOrders(filters);
        sendSuccess(res, 200, 'Orders fetched successfully', orders);
    } catch (err) {
        next(err);
    }
};

const getDriverAssignments = async (req, res, next) => {
    try {
        const { driverId } = req.params;
        const orders = await orderService.getDriverAssignments(driverId);
        sendSuccess(res, 200, 'Driver assignments fetched successfully', orders);
    } catch (err) {
        next(err);
    }
};

const assign = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { driver_id } = req.body;
        const updated = await orderService.assignDriver(id, driver_id, req.user.id);
        sendSuccess(res, 200, 'Driver assigned successfully', updated);
    } catch (err) {
        next(err);
    }
};

const updateStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updated = await orderService.updateStatus(id, req.body);
        sendSuccess(res, 200, 'Order status updated successfully', updated);
    } catch (err) {
        next(err);
    }
};

const markAsDelivered = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updated = await orderService.markAsDelivered(id);
        sendSuccess(res, 200, 'Order marked as delivered successfully', updated);
    } catch (err) {
        next(err);
    }
};

const cancel = async (req, res, next) => {
    try {
        const { id } = req.params;
        const cancelled = await orderService.cancelOrder(id);
        sendSuccess(res, 200, 'Order cancelled successfully', cancelled);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    create,
    bulkCreate,
    list,
    getDriverAssignments,
    assign,
    updateStatus,
    markAsDelivered,
    cancel
};

