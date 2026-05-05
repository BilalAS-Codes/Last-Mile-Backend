const walletRepository = require('./wallet.repository');

class WalletService {
    async getDriverWallet(driverId) {
        const cashInHand = await walletRepository.getUnsettledFunds(driverId);
        return { cashInHand };
    }

    async submitSettlement(driverId, amount) {
        return await walletRepository.createSettlement(driverId, amount);
    }

    async listSettlements() {
        return await walletRepository.getAllSettlements();
    }

    async approveSettlement(id) {
        return await walletRepository.updateSettlementStatus(id, 'Approved');
    }
}

module.exports = new WalletService();
