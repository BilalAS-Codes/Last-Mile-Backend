const billingService = require('./billing.service');

class BillingController {
    async generate(req, res, next) {
        try {
            const { client_id, billing_period, due_date } = req.body;
            const invoice = await billingService.generateInvoice(client_id, billing_period, due_date);
            res.status(201).json({
                success: true,
                message: 'Invoice generated successfully',
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
                message: 'Invoices fetched successfully',
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
                message: 'All invoices fetched successfully',
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
                message: 'Client invoices fetched successfully',
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
                message: 'Revenue statistics fetched successfully',
                data: stats
            });
        } catch (err) {
            next(err);
        }
    }

    async getUninvoicedOrders(req, res, next) {
        try {
            // Check both camelCase and snake_case for the query parameter
            const clientId = req.query.clientId || req.query.client_id;
            const orders = await billingService.getUninvoicedOrders(clientId);
            res.status(200).json({
                success: true,
                message: 'Uninvoiced orders fetched successfully',
                data: orders
            });
        } catch (err) {
            next(err);
        }
    }

    async createManualInvoice(req, res, next) {
        try {
            const { orderIds, billing_period, due_date, extra_charges } = req.body;
            const invoice = await billingService.createInvoiceWithFees(orderIds, billing_period, due_date, extra_charges);
            res.status(201).json({
                success: true,
                message: 'Manual invoice created successfully',
                data: invoice
            });
        } catch (err) {
            next(err);
        }
    }

    async markAsPaid(req, res, next) {
        try {
            const { id } = req.params;
            const invoice = await billingService.markAsPaid(id);
            res.status(200).json({
                success: true,
                message: 'Invoice marked as paid successfully',
                data: invoice
            });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new BillingController();
