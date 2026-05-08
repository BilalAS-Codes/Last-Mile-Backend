const errorHandler = (err, req, res, next) => {
    console.error('Error Handler Caught:', err.message);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Server Error';
    const details = err.details || undefined;

    // PostgreSQL Unique Constraint Error
    if (err.code === '23505') {
        return res.status(400).json({
            success: false,
            error: 'Duplicate field value entered',
        });
    }

    // PostgreSQL Foreign Key Violation
    if (err.code === '23503') {
        return res.status(400).json({
            success: false,
            error: 'Reference error: check if the related entity exists',
        });
    }

    res.status(statusCode).json({
        success: false,
        error: message,
        details: details
    });
};

module.exports = errorHandler;
