const userService = require('./user.service');

class UserController {
    async listUsers(req, res, next) {
        try {
            const users = await userService.listAllUsers();
            res.status(200).json({
                success: true,
                data: users
            });
        } catch (err) {
            next(err);
        }
    }

    async listDrivers(req, res, next) {
        try {
            const drivers = await userService.getDrivers();
            res.status(200).json({
                success: true,
                data: drivers
            });
        } catch (err) {
            next(err);
        }
    }

    async updateDriverStatus(req, res, next) {
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
    }

    async update(req, res, next) {
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
    }

    async delete(req, res, next) {
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
    }
}

module.exports = new UserController();
