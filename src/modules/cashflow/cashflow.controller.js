const cashflowService = require('./cashflow.service');
const walletService = require('../wallet/wallet.service');

const getStats = async (req, res, next) => {
    try {
        const stats = await cashflowService.getDashboardStats();
        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (err) {
        next(err);
    }
};

const getSettlements = async (req, res, next) => {
    try {
        const settlements = await cashflowService.getSettlementHistory();
        res.status(200).json({
            success: true,
            data: settlements
        });
    } catch (err) {
        next(err);
    }
};

const getDriverSettlements = async (req, res, next) => {
    try {
        const { driverId } = req.params;
        const settlements = await cashflowService.getDriverSettlementHistory(driverId);
        res.status(200).json({
            success: true,
            data: settlements
        });
    } catch (err) {
        next(err);
    }
};

const approveSettlement = async (req, res, next) => {
    try {
        const { id } = req.params;
        const approved = await walletService.approveSettlement(id, req.user.id);
        res.status(200).json({
            success: true,
            message: 'Settlement approved and driver cash balance updated',
            data: approved
        });
    } catch (err) {
        next(err);
    }
};

const directSettlement = async (req, res, next) => {
    try {
        const { driverId, amount } = req.body;
        const settlement = await walletService.directSettlement(driverId, amount, req.user.id);
        res.status(201).json({
            success: true,
            message: 'Settlement processed successfully',
            data: settlement
        });
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
