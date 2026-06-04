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

const getDriverLocation = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (req.user.role.toLowerCase() !== 'admin' && req.user.id !== id) {
            const error = new Error('Not authorized to view this location');
            error.statusCode = 403;
            throw error;
        }

        const location = await driverService.getDriverLocation(id);
        sendSuccess(res, 200, 'Driver location fetched successfully', location);
    } catch (error) {
        next(error);
    }
};

const getAssignmentStrategy = async (req, res, next) => {
    try {
        const config = require('../../config/assignment-config');
        const settings = config.getSettings();
        sendSuccess(res, 200, 'Assignment strategy fetched successfully', settings);
    } catch (error) {
        next(error);
    }
};

const updateAssignmentStrategy = async (req, res, next) => {
    try {
        const { strategy } = req.body;
        if (!strategy) {
            const error = new Error('Strategy is required');
            error.statusCode = 400;
            throw error;
        }
        const config = require('../../config/assignment-config');
        const settings = config.updateSettings(strategy);
        sendSuccess(res, 200, 'Assignment strategy updated successfully', settings);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    updateLocation,
    getLocations,
    getDriverLocation,
    getAssignmentStrategy,
    updateAssignmentStrategy
};
