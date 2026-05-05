const Joi = require('joi');

const generateInvoiceSchema = Joi.object({
    body: Joi.object({
        client_id: Joi.string().uuid().required(),
        billing_period: Joi.string().required(),
    })
});

module.exports = {
    generateInvoiceSchema,
};
