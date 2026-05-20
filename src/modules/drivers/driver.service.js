const driverRepository = require('./driver.repository');

const updateLocation = async (driverId, latitude, longitude) => {
    return await driverRepository.addLocation(driverId, latitude, longitude);
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
