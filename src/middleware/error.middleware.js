const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    let error = { ...err };
    error.message = err.message;

    // PostgreSQL Unique Constraint Error
    if (err.code === '23505') {
        return res.status(400).json({
            error: 'Duplicate field value entered',
        });
    }

    // PostgreSQL Foreign Key Violation
    if (err.code === '23503') {
        return res.status(400).json({
            error: 'Reference error: check if the related entity exists',
        });
    }

    res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Server Error',
    });
};

module.exports = errorHandler;
