const Joi = require('joi');

const updateDriverStatusSchema = Joi.object({
    params: Joi.object({
        id: Joi.string().uuid().required().messages({ 'string.uuid': 'Invalid user ID format' }),
    }),
    body: Joi.object({
        is_active: Joi.boolean().required().messages({ 'any.required': 'Active status is required' }),
    })
});

const updateUserSchema = Joi.object({
    params: Joi.object({
        id: Joi.string().uuid().required().messages({ 'string.uuid': 'Invalid user ID format' }),
    }),
    body: Joi.object({
        name: Joi.string().optional().trim().empty("").min(3).messages({
            'string.min': 'Name must be at least 3 characters long',
            'any.required': 'Name is required'
        }),
        email: Joi.string().email().optional().messages({ 'string.email': 'Invalid email format' }),
        role: Joi.string().valid('admin', 'client', 'driver').optional().messages({ 'any.only': 'Invalid role' }),
        active: Joi.boolean().optional(),
        vehicle_number: Joi.when('role', {
            is: 'driver',
            then: Joi.string().required().messages({ 'any.required': 'Vehicle number is required for drivers' }),
            otherwise: Joi.string().optional()
        }),
        vehicle_type: Joi.when('role', {
            is: 'driver',
            then: Joi.string().required().messages({ 'any.required': 'Vehicle type is required for drivers' }),
            otherwise: Joi.string().optional()
        }),
        phone: Joi.string().optional(),
        company_details: Joi.object({
            phone: Joi.string().optional(),
            address: Joi.object({
                zip: Joi.string().optional(),
                city: Joi.string().optional(),
                state: Joi.string().optional(),
                street: Joi.string().optional()
            }).optional(),
            feeType: Joi.string().valid('fixed', 'percentage').optional(),
            feeValue: Joi.number().optional(),
            companyName: Joi.string().optional(),
            billingEmail: Joi.string().email().optional()
        }).optional(),
        currency: Joi.string().trim().max(10).optional(),
    }).min(1).messages({ 'object.min': 'At least one field must be provided for update' })
});

const deleteUserSchema = Joi.object({
    params: Joi.object({
        id: Joi.string().uuid().required().messages({ 'string.uuid': 'Invalid user ID format' }),
    })
});

module.exports = {
    updateDriverStatusSchema,
    updateUserSchema,
    deleteUserSchema,
};
