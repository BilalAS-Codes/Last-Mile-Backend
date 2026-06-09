const userRepository = require('./user.repository');

const listAllUsers = async () => {
    return await userRepository.getAllUsers();
};

const getDrivers = async () => {
    return await userRepository.getActiveDrivers();
};

const getClients = async () => {
    return await userRepository.getClients();
};

const updateStatus = async (id, isActive) => {
    const driver = await userRepository.findById(id);
    const result = await userRepository.updateDriverStatus(id, isActive);
    try {
        if (driver) {
            const { notifyDriverStatusChanged } = require('../notifications/driver/driver.notifications');
            const { notifyAdminDriverStatusChanged } = require('../notifications/admin/admin.notifications');
            await Promise.all([
                notifyDriverStatusChanged(id, isActive),
                notifyAdminDriverStatusChanged(driver.name, isActive)
            ]);
        }
    } catch (e) {
        console.error('Failed to trigger driver status changed notifications:', e);
    }
    return result;
};

const updateUser = async (id, userData) => {
    const existingUser = await userRepository.findById(id);
    if (!existingUser) {
        throw new Error('User not found');
    }

    const role = (userData.role || existingUser.role).toLowerCase();

    if ((userData.vehicle_number || userData.vehicle_type) && role !== 'driver') {
        throw new Error('Vehicle information can only be updated for drivers');
    }

    if (userData.company_details && role !== 'client') {
        throw new Error('Company details can only be updated for clients');
    }

    // Map nested fee info to top-level columns if present
    if (userData.company_details) {
        if (userData.company_details.feeType) {
            userData.fee_type = userData.company_details.feeType.toLowerCase();
        }
        if (userData.company_details.feeValue) {
            userData.fee_value = userData.company_details.feeValue;
        }
    }

    return await userRepository.update(id, userData);
};

const deleteUser = async (id) => {
    return await userRepository.deleteUser(id);
};

module.exports = {
    listAllUsers,
    getDrivers,
    getClients,
    updateStatus,
    updateUser,
    deleteUser
};
