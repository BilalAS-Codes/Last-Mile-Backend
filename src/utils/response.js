/**
 * Standardize successful API responses
 * @param {Object} res - Express response object
 * @param {Number} statusCode - HTTP status code
 * @param {String} message - Success message
 * @param {Object} data - Payload to send
 */
const sendSuccess = (res, statusCode, message, data = null) => {
    return res.status(statusCode).json({
        success: true,
        message,
        ...(data !== null && { data })
    });
};

module.exports = { sendSuccess };
