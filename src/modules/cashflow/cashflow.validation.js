const Joi = require('joi');

const approveSettlementSchema = Joi.object({
    params: Joi.object({
        id: Joi.string().uuid().required(),
    })
});

module.exports = {
    approveSettlementSchema,
};
