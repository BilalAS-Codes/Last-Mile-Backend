const userRepository = require('./user.repository');

class UserService {
    async listAllUsers() {
        return await userRepository.getAllUsers();
    }

    async getDrivers() {
        return await userRepository.getActiveDrivers();
    }

    async getClients() {
        return await userRepository.getClients();
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

        if (userData.company_details && role !== 'client') {
            throw new Error('Company details can only be updated for clients');
        }

        // Map nested fee info to top-level columns if present
        if (userData.company_details) {
            if (userData.company_details.feeType) {
                userData.fee_type = userData.company_details.feeType;
            }
            if (userData.company_details.feeValue) {
                userData.fee_value = userData.company_details.feeValue;
            }
        }

        return await userRepository.update(id, userData);
    }

    async deleteUser(id) {
        return await userRepository.delete(id);
    }
}

module.exports = new UserService();
