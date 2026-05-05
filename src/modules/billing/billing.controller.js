const billingService = require('./billing.service');

class BillingController {
    async generate(req, res, next) {
        try {
            const { client_id, billing_period } = req.body;
            const invoice = await billingService.generateInvoice(client_id, billing_period);
            res.status(201).json({
                success: true,
                data: invoice
            });
        } catch (err) {
            next(err);
        }
    }

    async getMyInvoices(req, res, next) {
        try {
            const invoices = await billingService.getClientInvoices(req.user.id);
            res.status(200).json({
                success: true,
                data: invoices
            });
        } catch (err) {
            next(err);
        }
    }

    async listInvoices(req, res, next) {
        try {
            const invoices = await billingService.listAllInvoices();
            res.status(200).json({
                success: true,
                data: invoices
            });
        } catch (err) {
            next(err);
        }
    }

    async getClientInvoices(req, res, next) {
        try {
            const { clientId } = req.params;
            const invoices = await billingService.getClientInvoices(clientId);
            res.status(200).json({
                success: true,
                data: invoices
            });
        } catch (err) {
            next(err);
        }
    }

    async getRevenueStats(req, res, next) {
        try {
            const stats = await billingService.getRevenueStats();
            res.status(200).json({
                success: true,
                data: stats
            });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new BillingController();
