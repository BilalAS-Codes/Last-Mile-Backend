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
        return await userRepository.update(id, userData);
    }

    async deleteUser(id) {
        return await userRepository.delete(id);
    }
}

module.exports = new UserService();
