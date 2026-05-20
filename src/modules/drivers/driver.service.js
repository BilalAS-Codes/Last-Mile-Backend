const driverRepository = require('./driver.repository');

const updateLocation = async (driverId, latitude, longitude) => {
    return await driverRepository.addLocation(driverId, latitude, longitude);
};

const getLocations = async () => {
    return await driverRepository.getLatestLocations();
};

module.exports = {
    updateLocation,
    getLocations
};
