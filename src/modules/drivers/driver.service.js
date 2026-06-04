const driverRepository = require('./driver.repository');
const queueService = require('../queue/queue.service');

const updateLocation = async (driverId, latitude, longitude) => {
    const result = await driverRepository.addLocation(driverId, latitude, longitude);
    
    // Publish status to queue so the driver is registered as available/online for auto-assignment
    await queueService.publishJob('vehicle.status', {
        jobId: driverId,
        type: 'online',
        status: 'available'
    });

    return result;
};

const getLocations = async () => {
    return await driverRepository.getLatestLocations();
};

const getDriverLocation = async (driverId) => {
    return await driverRepository.getDriverLocation(driverId);
};

module.exports = {
    updateLocation,
    getLocations,
    getDriverLocation
};
