const cashflowService = require('./cashflow.service');
const walletService = require('../wallet/wallet.service');
const { sendSuccess } = require('../../utils/response');

const getStats = async (req, res, next) => {
    try {
        const stats = await cashflowService.getDashboardStats();
        sendSuccess(res, 200, 'Dashboard statistics fetched successfully', stats);
    } catch (err) {
        next(err);
    }
};

const getSettlements = async (req, res, next) => {
    try {
        const settlements = await cashflowService.getSettlementHistory();
        sendSuccess(res, 200, 'Settlement history fetched successfully', settlements);
    } catch (err) {
        next(err);
    }
};

const getDriverSettlements = async (req, res, next) => {
    try {
        const { driverId } = req.params;
        const settlements = await cashflowService.getDriverSettlementHistory(driverId);
        sendSuccess(res, 200, 'Driver settlement history fetched successfully', settlements);
    } catch (err) {
        next(err);
    }
};

const approveSettlement = async (req, res, next) => {
    try {
        const { id } = req.params;
        const approved = await walletService.approveSettlement(id, req.user.id);
        sendSuccess(res, 200, 'Settlement approved and driver cash balance updated', approved);
    } catch (err) {
        next(err);
    }
};

const directSettlement = async (req, res, next) => {
    try {
        const { driverId, amount } = req.body;
        const settlement = await walletService.directSettlement(driverId, amount, req.user.id);
        sendSuccess(res, 201, 'Settlement processed successfully', settlement);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getStats,
    getSettlements,
    getDriverSettlements,
    approveSettlement,
    directSettlement
};

