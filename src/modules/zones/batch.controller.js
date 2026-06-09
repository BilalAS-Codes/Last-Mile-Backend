const batchService = require('./batch.service');

const createManualBatch = async (req, res) => {
    try {
        const { orderIds } = req.body;
        const result = await batchService.createManualBatch(orderIds);
        return res.status(201).json({
            success: true,
            message: 'Manual batch created successfully',
            data: result
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const getUnassignedBatches = async (req, res) => {
    try {
        const result = await batchService.getUnassignedBatches();
        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const assignDriverToBatch = async (req, res) => {
    try {
        const { id } = req.params;
        const { driverId } = req.body;
        if (!driverId) {
            return res.status(400).json({
                success: false,
                message: 'driverId is required'
            });
        }
        const adminId = req.user?.id || null;
        const result = await batchService.assignDriverToBatch(id, driverId, adminId);
        return res.status(200).json({
            success: true,
            message: 'Batch assigned to driver successfully',
            data: result
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const triggerAutoClubbing = async (req, res) => {
    try {
        const result = await batchService.autoClubOrders();
        return res.status(200).json({
            success: true,
            message: `Successfully executed auto-clubbing. Created ${result.length} batches.`,
            data: result
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    createManualBatch,
    getUnassignedBatches,
    assignDriverToBatch,
    triggerAutoClubbing
};
