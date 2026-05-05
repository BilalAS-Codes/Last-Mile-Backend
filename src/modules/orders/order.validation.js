const Joi = require('joi');

const createOrderSchema = Joi.object({
    body: Joi.object({
        pickup_address: Joi.string().required(),
        delivery_address: Joi.string().required(),
        customer_name: Joi.string().required(),
        customer_phone: Joi.string().required(),
        is_cod: Joi.boolean().default(false),
        cod_amount: Joi.number().when('is_cod', { is: true, then: Joi.required(), otherwise: Joi.optional() }),
    })
});

const assignDriverSchema = Joi.object({
    params: Joi.object({
        id: Joi.string().uuid().required(),
    }),
    body: Joi.object({
        driver_id: Joi.string().uuid().required(),
    })
});

const updateOrderStatusSchema = Joi.object({
    params: Joi.object({
        id: Joi.string().uuid().required(),
    }),
    body: Joi.object({
        status: Joi.string().valid('PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED').required(),
        cod_collected: Joi.boolean().optional(),
    })
});

module.exports = {
    createOrderSchema,
    assignDriverSchema,
    updateOrderStatusSchema,
};
