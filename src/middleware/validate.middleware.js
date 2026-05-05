const validate = (schema) => (req, res, next) => {
    const { body, query, params } = req;
    const dataToValidate = {};

    if (Object.keys(body).length > 0) dataToValidate.body = body;
    if (Object.keys(query).length > 0) dataToValidate.query = query;
    if (Object.keys(params).length > 0) dataToValidate.params = params;

    const { error, value } = schema.validate(dataToValidate, {
        abortEarly: false,
        allowUnknown: true,
        stripUnknown: true,
    });

    if (error) {
        const errorMessage = error.details
            .map((details) => details.message)
            .join(', ');
        return res.status(400).json({ error: errorMessage });
    }

    // Update req with validated and stripped values
    if (value.body) req.body = value.body;
    if (value.query) req.query = value.query;
    if (value.params) req.params = value.params;

    next();
};

module.exports = validate;
