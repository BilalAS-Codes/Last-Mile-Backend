const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    const details = err.details || undefined;

    // Log the actual error for debugging
    console.error(`[ERROR] ${req.method} ${req.url} - ${err.message}`);
    if (statusCode === 500) {
        console.error(err.stack);
    }

    // PostgreSQL Unique Constraint Error
    if (err.code === '23505') {
        statusCode = 400;
        message = 'Duplicate entry: A record with this information already exists.';
    }

    // PostgreSQL Foreign Key Violation
    else if (err.code === '23503') {
        statusCode = 400;
        message = 'Reference error: The related data you are trying to use does not exist.';
    }

    // PostgreSQL Data Type/Value Errors (e.g. invalid UUID)
    else if (err.code === '22P02') {
        statusCode = 400;
        message = 'Invalid input format: Please check your data types.';
    }

    // Hide internal error details in production-like environments or if it's a 500
    if (statusCode === 500 && process.env.NODE_ENV === 'production') {
        message = 'An unexpected server error occurred. Please try again later.';
    }

    res.status(statusCode).json({
        success: false,
        message: message,
        ...(details && { details })
    });
};

module.exports = errorHandler;

