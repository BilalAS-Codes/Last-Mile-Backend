const walletRepository = require('./wallet.repository');
const userRepository = require('../users/user.repository');

const getDriverWallet = async (driverId) => {
    const cashInHand = await walletRepository.getUnsettledFunds(driverId);
    return { cashInHand };
};

const submitSettlement = async (driverId, amount) => {
    return await walletRepository.createSettlementWithLock(driverId, amount);
};

const listSettlements = async () => {
    return await walletRepository.getAllSettlements();
};

const approveSettlement = async (id, adminId) => {
    return await walletRepository.approveSettlementWithTransaction(id, adminId);
};

const directSettlement = async (driverId, amount, adminId) => {
    return await walletRepository.directSettlementWithTransaction(driverId, amount, adminId);
};

module.exports = {
    getDriverWallet,
    submitSettlement,
    listSettlements,
    approveSettlement,
    directSettlement
};
