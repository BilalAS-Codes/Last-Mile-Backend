const userService = require('./user.service');

const listUsers = async (req, res, next) => {
    try {
        const users = await userService.listAllUsers();
        res.status(200).json({
            success: true,
            data: users
        });
    } catch (err) {
        next(err);
    }
};

const listDrivers = async (req, res, next) => {
    try {
        const drivers = await userService.getDrivers();
        res.status(200).json({
            success: true,
            data: drivers
        });
    } catch (err) {
        next(err);
    }
};

const listClients = async (req, res, next) => {
    try {
        const clients = await userService.getClients();
        res.status(200).json({
            success: true,
            data: clients
        });
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
            return res.status(404).json({ error: 'Driver not found' });
        }
        res.status(200).json({
            success: true,
            data: updated
        });
    } catch (err) {
        next(err);
    }
};

const update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updated = await userService.updateUser(id, req.body);
        if (!updated) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({
            success: true,
            data: updated
        });
    } catch (err) {
        next(err);
    }
};

const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const deleted = await userService.deleteUser(id);
        if (!deleted) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
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
