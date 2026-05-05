const Joi = require('joi');

const registerSchema = Joi.object({
    body: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        name: Joi.string().required(),
        role: Joi.string().valid('Admin', 'Client', 'Driver').required(),
        vehicle_plate: Joi.string().when('role', { is: 'Driver', then: Joi.required() }),
        vehicle_type: Joi.string().when('role', { is: 'Driver', then: Joi.required() }),
    })
});

const loginSchema = Joi.object({
    body: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    })
});

module.exports = {
    registerSchema,
    loginSchema,
};
