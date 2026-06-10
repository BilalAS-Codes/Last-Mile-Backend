const zoneService = require('./zone.service');

const createZone = async (req, res) => {
    try {
        const { name, coordinates } = req.body;
        console.log(`[ZONE CREATION] Creating zone "${name}" with coordinates:`, JSON.stringify(coordinates));
        const newZone = await zoneService.createZone({ name, coordinates });
        return res.status(201).json({
            success: true,
            data: newZone
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const getAllZones = async (req, res) => {
    try {
        const zones = await zoneService.getAllZones();
        return res.status(200).json({
            success: true,
            data: zones
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const deleteZone = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await zoneService.deleteZone(id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Zone not found'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Zone deleted successfully',
            data: deleted
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const assignDriver = async (req, res) => {
    try {
        const { driverId, zoneIds } = req.body;
        if (!driverId) {
            return res.status(400).json({
                success: false,
                message: 'driverId is required'
            });
        }
        if (!zoneIds || !Array.isArray(zoneIds)) {
            return res.status(400).json({
                success: false,
                message: 'zoneIds must be an array'
            });
        }

        const assignments = await zoneService.assignDriverToZonesWithAvailability(driverId, zoneIds);
        return res.status(200).json({
            success: true,
            message: 'Driver assigned to zones successfully',
            data: assignments
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const getDriverZones = async (req, res) => {
    try {
        const { driverId } = req.params;
        const zones = await zoneService.getZonesForDriver(driverId);
        return res.status(200).json({
            success: true,
            data: zones
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const updateZone = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, coordinates } = req.body;
        const updated = await zoneService.updateZone(id, { name, coordinates });
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Zone not found'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Zone updated successfully',
            data: updated
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    createZone,
    getAllZones,
    deleteZone,
    assignDriver,
    getDriverZones,
    updateZone
};
