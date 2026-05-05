const userRepository = require('./user.repository');

class UserService {
    async listAllUsers() {
        return await userRepository.getAllUsers();
    }

    async getDrivers() {
        return await userRepository.getActiveDrivers();
    }

    async updateStatus(id, isActive) {
        return await userRepository.updateDriverStatus(id, isActive);
    }

    async updateUser(id, userData) {
        const existingUser = await userRepository.findById(id);
        if (!existingUser) {
            throw new Error('User not found');
        }

        const role = userData.role || existingUser.role;

        if ((userData.vehicle_number || userData.vehicle_type) && role !== 'driver') {
            throw new Error('Vehicle information can only be updated for drivers');
        }

        return await userRepository.update(id, userData);
    }

    async deleteUser(id) {
        return await userRepository.delete(id);
    }
}

module.exports = new UserService();
