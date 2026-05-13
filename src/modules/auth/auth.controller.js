const authService = require('./auth.service');
const { sendSuccess } = require('../../utils/response');

const register = async (req, res, next) => {
    try {
        const user = await authService.register(req.body);
        sendSuccess(res, 201, 'User registered successfully', user);
    } catch (err) {
        next(err);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const result = await authService.login(email, password);
        sendSuccess(res, 200, 'Login successful', result);
    } catch (err) {
        next(err);
    }
};

const driverLogin = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const result = await authService.driverLogin(email, password);
        sendSuccess(res, 200, 'Driver login successful', result);
    } catch (err) {
        next(err);
    }
};

const getMe = async (req, res, next) => {
    try {
        const user = await authService.getMe(req.user.id);
        sendSuccess(res, 200, 'User profile fetched successfully', user);
    } catch (err) {
        next(err);
    }
};

const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const result = await authService.forgotPassword(email);
        sendSuccess(res, 200, result.message || 'OTP sent successfully', result);
    } catch (err) {
        next(err);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        const { email, otp, newPassword } = req.body;
        const result = await authService.resetPassword(email, otp, newPassword);
        sendSuccess(res, 200, result.message || 'Password reset successfully', result);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    register,
    login,
    driverLogin,
    getMe,
    forgotPassword,
    resetPassword
};

