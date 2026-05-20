const Joi = require('joi');

const updateLocationSchema = Joi.object({
  latitude: Joi.number().required().min(-90).max(90),
  longitude: Joi.number().required().min(-180).max(180)
});

module.exports = {
  updateLocationSchema
};
