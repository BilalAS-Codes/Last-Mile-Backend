const cashflowRepository = require('./cashflow.repository');

const getDashboardStats = async () => {
    return await cashflowRepository.getStats();
};

const getSettlementHistory = async () => {
    return await cashflowRepository.getSettlementHistory();
};

const getDriverSettlementHistory = async (driverId) => {
    return await cashflowRepository.getDriverSettlementHistory(driverId);
};

module.exports = {
    getDashboardStats,
    getSettlementHistory,
    getDriverSettlementHistory
};
