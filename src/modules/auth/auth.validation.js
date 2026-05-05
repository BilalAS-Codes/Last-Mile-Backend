const Joi = require('joi');

const registerSchema = Joi.object({
    body: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        name: Joi.string().required(),
        role: Joi.string().valid('admin', 'client', 'driver').required(),
        vehicle_plate: Joi.string().when('role', { is: 'driver', then: Joi.required() }),
        vehicle_type: Joi.string().when('role', { is: 'driver', then: Joi.required() }),
    })
});

const loginSchema = Joi.object({
    body: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    })
});

const forgotPasswordSchema = Joi.object({
    body: Joi.object({
        email: Joi.string().email().required(),
    })
});

const resetPasswordSchema = Joi.object({
    body: Joi.object({
        email: Joi.string().email().required(),
        otp: Joi.string().length(6).required(),
        newPassword: Joi.string().min(6).required(),
    })
});

module.exports = {
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
};
