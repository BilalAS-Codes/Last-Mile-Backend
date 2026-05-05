const orderService = require('./order.service');

class OrderController {
    async create(req, res, next) {
        try {
            const order = await orderService.createOrder(req.user.id, req.body);
            res.status(201).json({
                success: true,
                data: order
            });
        } catch (err) {
            next(err);
        }
    }

    async bulkCreate(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'Please upload a CSV file' });
            }
            const result = await orderService.bulkCreateOrders(req.user.id, req.file.buffer);
            res.status(201).json({
                success: true,
                ...result
            });
        } catch (err) {
            next(err);
        }
    }

    async list(req, res, next) {
        try {
            const filters = req.query;
            const userRole = req.user.role.toUpperCase();
            if (userRole === 'CLIENT') filters.client_id = req.user.id;
            if (userRole === 'DRIVER') filters.driver_id = req.user.id;
            
            const orders = await orderService.getOrders(filters);
            res.status(200).json({
                success: true,
                data: orders
            });
        } catch (err) {
            next(err);
        }
    }

    async getDriverAssignments(req, res, next) {
        try {
            const { driverId } = req.params;
            const orders = await orderService.getDriverAssignments(driverId);
            res.status(200).json({
                success: true,
                data: orders
            });
        } catch (err) {
            next(err);
        }
    }

    async assign(req, res, next) {
        try {
            const { id } = req.params;
            const { driver_id } = req.body;
            const updated = await orderService.assignDriver(id, driver_id);
            res.status(200).json({
                success: true,
                data: updated
            });
        } catch (err) {
            next(err);
        }
    }

    async updateStatus(req, res, next) {
        try {
            const { id } = req.params;
            const updated = await orderService.updateStatus(id, req.body);
            res.status(200).json({
                success: true,
                data: updated
            });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new OrderController();
