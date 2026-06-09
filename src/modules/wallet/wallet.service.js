const walletRepository = require('./wallet.repository');
const userRepository = require('../users/user.repository');

const getDriverWallet = async (driverId) => {
    const [user, unsettledFunds] = await Promise.all([
        userRepository.findById(driverId),
        walletRepository.getUnsettledFunds(driverId)
    ]);

    if (!user) {
        const error = new Error('Driver not found');
        error.statusCode = 404;
        throw error;
    }

    const availableBalance = parseFloat(user.cash_in_hand || 0);
    const pendingBalance = parseFloat(user.pending_settlement_balance || 0);

    return {
        cash_in_hand: availableBalance, // Net available (already deducted in DB upon request)
        pending_settlement_balance: pendingBalance,
        total_collected_held: availableBalance + pendingBalance, // Total cash currently with driver
        total_cod_collected: parseFloat(unsettledFunds || 0)
    };
};

const submitSettlement = async (driverId, amount) => {
    const driver = await userRepository.findById(driverId);
    const result = await walletRepository.createSettlementWithLock(driverId, amount);
    try {
        if (driver) {
            const { notifyAdminSettlementSubmitted } = require('../notifications/admin/admin.notifications');
            await notifyAdminSettlementSubmitted(driver.name, amount, driver.currency || 'SAR');
        }
    } catch (e) {
        console.error('Failed to trigger settlement submitted notification:', e);
    }
    return result;
};

const listSettlements = async () => {
    return await walletRepository.getAllSettlements();
};

const getDriverSettlements = async (driverId) => {
    return await walletRepository.getSettlementsByDriverId(driverId);
};

const updateSettlement = async (id, status, adminId) => {
    let result;
    if (status.toLowerCase() === 'approved') {
        result = await walletRepository.approveSettlementWithTransaction(id, adminId);
        try {
            if (result) {
                const { notifyDriverSettlementConfirmed } = require('../notifications/driver/driver.notifications');
                await notifyDriverSettlementConfirmed(result.driver_id, result.amount, result.currency || 'SAR');
            }
        } catch (e) {
            console.error('Failed to trigger settlement approval notification:', e);
        }
    } else if (status.toLowerCase() === 'rejected') {
        result = await walletRepository.rejectSettlementWithTransaction(id, adminId);
    } else {
        throw new Error('Invalid settlement status. Use "approved" or "rejected".');
    }
    return result;
};

const directSettlement = async (driverId, amount, adminId) => {
    return await walletRepository.directSettlementWithTransaction(driverId, amount, adminId);
};

const getDriverTransactions = async (driverId) => {
    return await walletRepository.getDriverTransactions(driverId);
};

module.exports = {
    getDriverWallet,
    submitSettlement,
    listSettlements,
    getDriverSettlements,
    updateSettlement,
    directSettlement,
    getDriverTransactions
};
