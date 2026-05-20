const driverRepository = require('./driver.repository');

const updateLocation = async (driverId, latitude, longitude) => {
    return await driverRepository.addLocation(driverId, latitude, longitude);
};

const getLocations = async () => {
    return await driverRepository.getLatestLocations();
};

const getDriverLocations = async (driverId) => {
    return await driverRepository.getDriverLocations(driverId);
};

module.exports = {
    updateLocation,
    getLocations,
    getDriverLocations
};
