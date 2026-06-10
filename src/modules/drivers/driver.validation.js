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

const getDriverLocationSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required().messages({ 'string.uuid': 'Invalid driver ID format' }),
  })
});

const updateAssignmentStrategySchema = Joi.object({
  body: Joi.object({
    strategy: Joi.string().valid('fifo', 'nearest', 'zone').required().messages({
      "any.required": "Strategy is required",
      "any.only": "Strategy must be one of: fifo, nearest, zone"
    }),
    order_clubbing: Joi.boolean().optional(),
    clubbing_distance: Joi.number().min(0).optional(),
    clubbing_time_difference: Joi.number().min(0).optional()
  })
});

module.exports = {
  updateLocationSchema,
  getDriverLocationSchema,
  updateAssignmentStrategySchema
};
