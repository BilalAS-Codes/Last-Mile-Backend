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
    return await walletRepository.createSettlementWithLock(driverId, amount);
};

const listSettlements = async () => {
    return await walletRepository.getAllSettlements();
};

const getDriverSettlements = async (driverId) => {
    return await walletRepository.getSettlementsByDriverId(driverId);
};

const updateSettlement = async (id, status, adminId) => {
    if (status.toLowerCase() === 'approved') {
        return await walletRepository.approveSettlementWithTransaction(id, adminId);
    } else if (status.toLowerCase() === 'rejected') {
        return await walletRepository.rejectSettlementWithTransaction(id, adminId);
    } else {
        throw new Error('Invalid settlement status. Use "approved" or "rejected".');
    }
};

const directSettlement = async (driverId, amount, adminId) => {
    return await walletRepository.directSettlementWithTransaction(driverId, amount, adminId);
};

module.exports = {
    getDriverWallet,
    submitSettlement,
    listSettlements,
    getDriverSettlements,
    updateSettlement,
    directSettlement
};
