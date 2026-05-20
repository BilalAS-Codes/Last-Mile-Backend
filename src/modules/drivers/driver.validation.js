const Joi = require('joi');

const updateLocationSchema = Joi.object({
  body: Joi.object({
    latitude: Joi.number().required().min(-90).max(90).messages({
      "any.required": "Latitude is required",
      "number.min": "Latitude must be greater than or equal to -90",
      "number.max": "Latitude must be less than or equal to 90"
    }),
    longitude: Joi.number().required().min(-180).max(180).messages({
      "any.required": "Longitude is required",
      "number.min": "Longitude must be greater than or equal to -180",
      "number.max": "Longitude must be less than or equal to 180"
    })
  })
});

const getDriverLocationsSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required().messages({ 'string.uuid': 'Invalid driver ID format' }),
  })
});

module.exports = {
  updateLocationSchema,
  getDriverLocationsSchema
};
