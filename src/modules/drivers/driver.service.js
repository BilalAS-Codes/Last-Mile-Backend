const driverRepository = require('./driver.repository');

class DriverService {
  async updateLocation(driverId, latitude, longitude) {
    const location = await driverRepository.addLocation(driverId, latitude, longitude);
    return location;
  }

  async getLocations() {
    const locations = await driverRepository.getLatestLocations();
    return locations;
  }
}

module.exports = new DriverService();
