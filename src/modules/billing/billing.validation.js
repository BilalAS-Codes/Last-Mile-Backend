const Joi = require('joi');

const generateInvoiceSchema = Joi.object({
    body: Joi.object({
        client_id: Joi.string().uuid().required().messages({
            'string.uuid': 'Invalid client ID format',
            'any.required': 'Client ID is required'
        }),
        billing_period: Joi.string().required().messages({
            'any.required': 'Billing period is required (e.g., "May 2026")'
        }),
        due_date: Joi.date().iso().required().messages({
            'date.format': 'Due date must be a valid ISO date',
            'any.required': 'Due date is required'
        }),
    })
});

const manualInvoiceSchema = Joi.object({
    body: Joi.object({
        orderIds: Joi.array().items(Joi.string().uuid()).min(1).required().messages({
            'array.min': 'At least one order ID must be selected',
            'any.required': 'Order IDs are required'
        }),
        billing_period: Joi.string().required().messages({
            'any.required': 'Billing period is required'
        }),
        due_date: Joi.date().iso().required().messages({
            'date.format': 'Due date must be a valid ISO date',
            'any.required': 'Due date is required'
        }),
        extra_charges: Joi.number().min(0).required().messages({
            'number.min': 'Extra charges cannot be negative',
            'any.required': 'Extra charges field is required (use 0 if none)'
        }),
    })
});

module.exports = {
    generateInvoiceSchema,
    manualInvoiceSchema
};
