const walletService = require('./wallet.service');

const getDriverWallet = async (req, res, next) => {
    try {
        const { driverId } = req.params;
        const wallet = await walletService.getDriverWallet(driverId);
        res.status(200).json({
            success: true,
            data: wallet
        });
    } catch (err) {
        next(err);
    }
};

const settle = async (req, res, next) => {
    try {
        const { amount } = req.body;
        console.log(amount, 'amount')
        const settlement = await walletService.submitSettlement(req.user.id, amount);
        res.status(201).json({
            success: true,
            data: settlement
        });
    } catch (err) {
        next(err);
    }
};

const listSettlements = async (req, res, next) => {
    try {
        const settlements = await walletService.listSettlements();
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
        
        // Authorization: Admin can see all, Driver can only see their own
        if (req.user.role.toLowerCase() !== 'admin' && req.user.id !== driverId) {
            const error = new Error('Not authorized to view these settlements');
            error.statusCode = 403;
            throw error;
        }

        const settlements = await walletService.getDriverSettlements(driverId);
        res.status(200).json({
            success: true,
            data: settlements
        });
    } catch (err) {
        next(err);
    }
};

const approve = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const updated = await walletService.updateSettlement(id, status || 'approved', req.user.id);
        res.status(200).json({
            success: true,
            data: updated
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getDriverWallet,
    settle,
    listSettlements,
    getDriverSettlements,
    approve
};
