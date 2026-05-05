const Joi = require('joi');

const orderBodySchema = Joi.object({
    pickup_address: Joi.object({
        lat: Joi.number().required(),
        long: Joi.number().required(),
        address: Joi.string().required(),
    }).required(),
    delivery_address: Joi.object({
        lat: Joi.number().required(),
        long: Joi.number().required(),
        address: Joi.string().required(),
    }).required(),
    customer_name: Joi.string().required(),
    customer_phone: Joi.string().required(),
    is_cod: Joi.boolean().default(false),
    cod_amount: Joi.number().when('is_cod', { is: true, then: Joi.required(), otherwise: Joi.optional() }),
}).options({ stripUnknown: true });

const createOrderSchema = Joi.object({
    body: orderBodySchema
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
    orderBodySchema,
    assignDriverSchema,
    updateOrderStatusSchema,
};
