const Joi = require('joi');

const updateDriverStatusSchema = Joi.object({
    params: Joi.object({
        id: Joi.string().uuid().required(),
    }),
    body: Joi.object({
        is_active: Joi.boolean().required(),
    })
});

const updateUserSchema = Joi.object({
    params: Joi.object({
        id: Joi.string().uuid().required(),
    }),
    body: Joi.object({
        name: Joi.string().optional(),
        email: Joi.string().email().optional(),
        role: Joi.string().valid('Admin', 'Client', 'Driver').optional(),
        active: Joi.boolean().optional(),
        vehicle_number: Joi.string().optional(),
        vehicle_type: Joi.string().optional(),
    }).min(1)
});

const deleteUserSchema = Joi.object({
    params: Joi.object({
        id: Joi.string().uuid().required(),
    })
});

module.exports = {
    updateDriverStatusSchema,
    updateUserSchema,
    deleteUserSchema,
};
