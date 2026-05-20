const driverService = require('./driver.service');

class DriverController {
  async updateLocation(req, res, next) {
    try {
      const driverId = req.user.id; // From auth middleware
      const { latitude, longitude } = req.body;
      const location = await driverService.updateLocation(driverId, latitude, longitude);
      res.status(200).json({ success: true, data: location });
    } catch (error) {
      next(error);
    }
  }

  async getLocations(req, res, next) {
    try {
      const locations = await driverService.getLocations();
      res.status(200).json({ success: true, data: locations });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DriverController();
