const Joi = require('joi');

const registerSchema = Joi.object({
    body: Joi.object({
        email: Joi.string().email().required().messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),
        password: Joi.string().min(6).required().messages({
            'string.min': 'Password must be at least 6 characters long',
            'any.required': 'Password is required'
        }),
        name: Joi.string().required().trim().empty("").min(3).messages({
            'string.min': 'Name must be at least 3 characters long',
            'any.required': 'Full name is required'
        }),
        role: Joi.string().valid('admin', 'client', 'driver').required().messages({
            'any.only': 'Role must be one of: admin, client, driver',
            'any.required': 'User role is required'
        }),
        vehicle_number: Joi.when('role', {
            is: 'driver',
            then: Joi.string().trim().required().messages({
                'any.required': 'Vehicle number is required for drivers'
            }),
            otherwise: Joi.string().allow('', null).optional()
        }),

        vehicle_type: Joi.when('role', {
            is: 'driver',
            then: Joi.string().trim().required().messages({
                'any.required': 'Vehicle type is required for drivers'
            }),
            otherwise: Joi.string().allow('', null).optional()
        }),
        phone: Joi.string().required().messages({
            'any.required': 'Phone number is required'
        }),
        company_details: Joi.object({
            phone: Joi.string().required(),
            address: Joi.object({
                zip: Joi.string().required(),
                city: Joi.string().required(),
                state: Joi.string().required(),
                street: Joi.string().required()
            }).required(),
            feeType: Joi.string().valid('fixed', 'percentage').required(),
            feeValue: Joi.number().required(),
            companyName: Joi.string().required(),
            billingEmail: Joi.string().email().required()
        }).when('role', { is: 'client', then: Joi.required(), otherwise: Joi.optional() }).messages({
            'any.required': 'Company details are required for clients'
        })
    })
});

const loginSchema = Joi.object({
    body: Joi.object({
        email: Joi.string().email().required().messages({
            'string.email': 'Invalid email format',
            'any.required': 'Email is required'
        }),
        password: Joi.string().required().messages({
            'any.required': 'Password is required'
        }),
    })
});

const forgotPasswordSchema = Joi.object({
    body: Joi.object({
        email: Joi.string().email().required().messages({
            'string.email': 'Invalid email format',
            'any.required': 'Email is required for password reset'
        }),
    })
});

const resetPasswordSchema = Joi.object({
    body: Joi.object({
        email: Joi.string().email().required().messages({
            'string.email': 'Invalid email format',
            'any.required': 'Email is required'
        }),
        otp: Joi.string().length(6).required().messages({
            'string.length': 'OTP must be exactly 6 characters',
            'any.required': 'OTP is required'
        }),
        newPassword: Joi.string().min(6).required().messages({
            'string.min': 'New password must be at least 6 characters',
            'any.required': 'New password is required'
        }),
    })
});

module.exports = {
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
};
