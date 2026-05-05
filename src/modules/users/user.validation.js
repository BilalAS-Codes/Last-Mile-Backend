const Joi = require('joi');

const updateDriverStatusSchema = Joi.object({
    params: Joi.object({
        id: Joi.string().uuid().required(),
    }),
    body: Joi.object({
        is_active: Joi.boolean().required(),
    })
});

module.exports = {
    updateDriverStatusSchema,
};
