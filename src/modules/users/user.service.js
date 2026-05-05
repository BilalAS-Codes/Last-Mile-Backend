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
}

module.exports = new UserService();
