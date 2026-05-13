const userService = require('./user.service');
const { sendSuccess } = require('../../utils/response');

const listUsers = async (req, res, next) => {
    try {
        const users = await userService.listAllUsers();
        sendSuccess(res, 200, 'Users fetched successfully', users);
    } catch (err) {
        next(err);
    }
};

const listDrivers = async (req, res, next) => {
    try {
        const drivers = await userService.getDrivers();
        sendSuccess(res, 200, 'Drivers fetched successfully', drivers);
    } catch (err) {
        next(err);
    }
};

const listClients = async (req, res, next) => {
    try {
        const clients = await userService.getClients();
        sendSuccess(res, 200, 'Clients fetched successfully', clients);
    } catch (err) {
        next(err);
    }
};

const updateDriverStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        const updated = await userService.updateStatus(id, is_active);
        if (!updated) {
            const error = new Error('Driver not found');
            error.statusCode = 404;
            throw error;
        }
        sendSuccess(res, 200, 'Driver status updated successfully', updated);
    } catch (err) {
        next(err);
    }
};

const update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updated = await userService.updateUser(id, req.body);
        if (!updated) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }
        sendSuccess(res, 200, 'User updated successfully', updated);
    } catch (err) {
        next(err);
    }
};

const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const deleted = await userService.deleteUser(id);
        if (!deleted) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }
        sendSuccess(res, 200, 'User deleted successfully');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    listUsers,
    listDrivers,
    listClients,
    updateDriverStatus,
    update,
    deleteUser
};

