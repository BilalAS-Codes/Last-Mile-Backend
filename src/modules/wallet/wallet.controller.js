const walletService = require('./wallet.service');
const { sendSuccess } = require('../../utils/response');

const getDriverWallet = async (req, res, next) => {
    try {
        const { driverId } = req.params;
        const wallet = await walletService.getDriverWallet(driverId);
        sendSuccess(res, 200, 'Wallet details fetched successfully', wallet);
    } catch (err) {
        next(err);
    }
};

const settle = async (req, res, next) => {
    try {
        const { amount } = req.body;
        const settlement = await walletService.submitSettlement(req.user.id, amount);
        sendSuccess(res, 201, 'Settlement request submitted successfully', settlement);
    } catch (err) {
        next(err);
    }
};

const listSettlements = async (req, res, next) => {
    try {
        const settlements = await walletService.listSettlements();
        sendSuccess(res, 200, 'Settlements listed successfully', settlements);
    } catch (err) {
        next(err);
    }
};

const getDriverSettlements = async (req, res, next) => {
    try {
        const { driverId } = req.params;
        
        if (req.user.role.toLowerCase() !== 'admin' && req.user.id !== driverId) {
            const error = new Error('Not authorized to view these settlements');
            error.statusCode = 403;
            throw error;
        }

        const settlements = await walletService.getDriverSettlements(driverId);
        sendSuccess(res, 200, 'Driver settlements fetched successfully', settlements);
    } catch (err) {
        next(err);
    }
};

const approve = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const updated = await walletService.updateSettlement(id, status || 'approved', req.user.id);
        sendSuccess(res, 200, `Settlement ${status || 'approved'} successfully`, updated);
    } catch (err) {
        next(err);
    }
};

const getDriverTransactions = async (req, res, next) => {
    try {
        const { driverId } = req.params;

        if (req.user.role.toLowerCase() !== 'admin' && req.user.id !== driverId) {
            const error = new Error('Not authorized to view these transactions');
            error.statusCode = 403;
            throw error;
        }

        const transactions = await walletService.getDriverTransactions(driverId);
        sendSuccess(res, 200, 'Driver transactions fetched successfully', transactions);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getDriverWallet,
    settle,
    listSettlements,
    getDriverSettlements,
    getDriverTransactions,
    approve
};

