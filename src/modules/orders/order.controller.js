const orderService = require('./order.service');

const create = async (req, res, next) => {
    try {
        const order = await orderService.createOrder(req.user.id, req.body);
        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: order
        });
    } catch (err) {
        next(err);
    }
};

const bulkCreate = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Please upload a CSV file' });
        }
        const result = await orderService.bulkCreateOrders(req.user.id, req.file.buffer);
        res.status(201).json({
            success: true,
            message: 'Bulk order processing completed',
            ...result
        });
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
        res.status(200).json({
            success: true,
            message: 'Orders fetched successfully',
            data: orders
        });
    } catch (err) {
        next(err);
    }
};

const getDriverAssignments = async (req, res, next) => {
    try {
        const { driverId } = req.params;
        const orders = await orderService.getDriverAssignments(driverId);
        res.status(200).json({
            success: true,
            message: 'Driver assignments fetched successfully',
            data: orders
        });
    } catch (err) {
        next(err);
    }
};

const assign = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { driver_id } = req.body;
        const updated = await orderService.assignDriver(id, driver_id);
        res.status(200).json({
            success: true,
            message: 'Driver assigned successfully',
            data: updated
        });
    } catch (err) {
        next(err);
    }
};

const updateStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updated = await orderService.updateStatus(id, req.body);
        res.status(200).json({
            success: true,
            message: 'Order status updated successfully',
            data: updated
        });
    } catch (err) {
        next(err);
    }
};

const markAsDelivered = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updated = await orderService.markAsDelivered(id);
        res.status(200).json({
            success: true,
            message: 'Order marked as delivered successfully',
            data: updated
        });
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
    markAsDelivered
};
