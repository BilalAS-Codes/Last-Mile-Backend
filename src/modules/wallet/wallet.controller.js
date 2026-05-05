const walletService = require('./wallet.service');

class WalletController {
    async getDriverWallet(req, res, next) {
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
    }

    async settle(req, res, next) {
        try {
            const { amount } = req.body;
            const settlement = await walletService.submitSettlement(req.user.id, amount);
            res.status(201).json({
                success: true,
                data: settlement
            });
        } catch (err) {
            next(err);
        }
    }

    async listSettlements(req, res, next) {
        try {
            const settlements = await walletService.listSettlements();
            res.status(200).json({
                success: true,
                data: settlements
            });
        } catch (err) {
            next(err);
        }
    }

    async approve(req, res, next) {
        try {
            const { id } = req.params;
            const approved = await walletService.approveSettlement(id);
            res.status(200).json({
                success: true,
                data: approved
            });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new WalletController();
