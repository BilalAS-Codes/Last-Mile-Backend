const orderRepository = require('./order.repository');

class OrderService {
    async createOrder(client_id, orderData) {
        const tracking_id = 'TRX' + Math.random().toString(36).substring(2, 10).toUpperCase();
        return await orderRepository.create({ ...orderData, client_id, tracking_id });
    }

    async getOrders(filters) {
        return await orderRepository.findAll(filters);
    }

    async getDriverAssignments(driverId) {
        return await orderRepository.findAll({ driver_id: driverId, status: 'Assigned' });
    }

    async assignDriver(orderId, driverId) {
        return await orderRepository.update(orderId, { driver_id: driverId, status: 'Assigned' });
    }

    async updateStatus(orderId, statusData) {
        return await orderRepository.update(orderId, statusData);
    }
}

module.exports = new OrderService();
