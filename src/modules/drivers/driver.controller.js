const driverService = require('./driver.service');
const { sendSuccess } = require('../../utils/response');

const updateLocation = async (req, res, next) => {
    try {
        const driverId = req.user.id; // From auth middleware
        const { latitude, longitude } = req.body;
        const location = await driverService.updateLocation(driverId, latitude, longitude);
        sendSuccess(res, 200, 'Driver location updated successfully', location);
    } catch (error) {
        next(error);
    }
};

const getLocations = async (req, res, next) => {
    try {
        const locations = await driverService.getLocations();
        sendSuccess(res, 200, 'Latest driver locations fetched successfully', locations);
    } catch (error) {
        next(error);
    }
};

const getDriverLocations = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (req.user.role.toLowerCase() !== 'admin' && req.user.id !== id) {
            const error = new Error('Not authorized to view these locations');
            error.statusCode = 403;
            throw error;
        }

        const locations = await driverService.getDriverLocations(id);
        sendSuccess(res, 200, 'Driver location history fetched successfully', locations);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    updateLocation,
    getLocations,
    getDriverLocations
};
