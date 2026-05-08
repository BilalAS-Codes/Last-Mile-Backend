const Joi = require('joi');

const orderBodySchema = Joi.object({
    pickup_address: Joi.object({
        lat: Joi.number().required().messages({ 'any.required': 'Pickup latitude is required' }),
        long: Joi.number().required().messages({ 'any.required': 'Pickup longitude is required' }),
        address: Joi.string().required().messages({ 'any.required': 'Pickup address is required' }),
    }).required().messages({ 'any.required': 'Pickup address object is required' }),
    delivery_address: Joi.object({
        lat: Joi.number().required().messages({ 'any.required': 'Delivery latitude is required' }),
        long: Joi.number().required().messages({ 'any.required': 'Delivery longitude is required' }),
        address: Joi.string().required().messages({ 'any.required': 'Delivery address is required' }),
    }).required().messages({ 'any.required': 'Delivery address object is required' }),
    customer_name: Joi.string().required().messages({ 'any.required': 'Customer name is required' }),
    customer_phone: Joi.string().required().messages({ 'any.required': 'Customer phone is required' }),
    order_value: Joi.number().min(0).required().messages({
        'number.min': 'Order value cannot be negative',
        'any.required': 'Order value is required'
    }),
    delivery_fee: Joi.number().min(1).required().messages({
        'number.min': 'Delivery fee cannot be less than 1',
        'any.required': 'Delivery fee is required'
    }),
    is_cod: Joi.boolean().default(false),
    cod_amount: Joi.number().when('is_cod', { is: true, then: Joi.required(), otherwise: Joi.optional() }).messages({
        'any.required': 'COD amount is required when order is COD'
    }),
}).options({ stripUnknown: true });

const createOrderSchema = Joi.object({
    body: orderBodySchema
});

const assignDriverSchema = Joi.object({
    params: Joi.object({
        id: Joi.string().uuid().required().messages({ 'string.uuid': 'Invalid order ID format' }),
    }),
    body: Joi.object({
        driver_id: Joi.string().uuid().required().messages({
            'string.uuid': 'Invalid driver ID format',
            'any.required': 'Driver ID is required for assignment'
        }),
    })
});

const updateOrderStatusSchema = Joi.object({
    params: Joi.object({
        id: Joi.string().uuid().required().messages({ 'string.uuid': 'Invalid order ID format' }),
    }),
    body: Joi.object({
        status: Joi.string().valid('pending', 'assigned', 'picked-up', 'in-transit', 'delivered', 'cancelled').required().messages({
            'any.only': 'Invalid status. Must be one of: pending, assigned, picked-up, in-transit, delivered, cancelled',
            'any.required': 'Status is required'
        }),
        cod_collected: Joi.boolean().optional(),
    })
});

module.exports = {
    createOrderSchema,
    orderBodySchema,
    assignDriverSchema,
    updateOrderStatusSchema,
};
