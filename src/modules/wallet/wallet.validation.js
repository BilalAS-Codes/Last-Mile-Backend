const Joi = require('joi');

const settleFundsSchema = Joi.object({
    body: Joi.object({
        amount: Joi.number().positive().required(),
    })
});

const approveSettlementSchema = Joi.object({
    params: Joi.object({
        id: Joi.string().uuid().required(),
    }),
    body: Joi.object({
        status: Joi.string().valid('Approved').required(),
    })
});

module.exports = {
    settleFundsSchema,
    approveSettlementSchema,
};
