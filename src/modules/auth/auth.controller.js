const authService = require('./auth.service');

const register = async (req, res, next) => {
    try {
        const user = await authService.register(req.body);
        console.log(user, 'user / driver')
        res.status(201).json({
            success: true,
            data: user
        });
    } catch (err) {
        next(err);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const result = await authService.login(email, password);
        res.status(200).json({
            success: true,
            ...result
        });
    } catch (err) {
        next(err);
    }
};

const driverLogin = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const result = await authService.driverLogin(email, password);
        res.status(200).json({
            success: true,
            ...result
        });
    } catch (err) {
        next(err);
    }
};

const getMe = async (req, res, next) => {
    try {
        const user = await authService.getMe(req.user.id);
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        next(err);
    }
};

const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const result = await authService.forgotPassword(email);
        res.status(200).json({
            success: true,
            ...result
        });
    } catch (err) {
        next(err);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        const { email, otp, newPassword } = req.body;
        const result = await authService.resetPassword(email, otp, newPassword);
        res.status(200).json({
            success: true,
            ...result
        });
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
