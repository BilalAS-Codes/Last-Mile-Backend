const authService = require('./auth.service');
const { sendSuccess } = require('../../utils/response');

const parseCookies = (cookieHeader) => {
    const list = {};
    if (!cookieHeader) return list;
    cookieHeader.split(';').forEach(cookie => {
        let parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURIComponent(parts.join('='));
    });
    return list;
};

const getRefreshToken = (req) => {
    if (req.body && req.body.refreshToken) {
        return { token: req.body.refreshToken, source: 'body' };
    }
    if (req.headers && req.headers['x-refresh-token']) {
        return { token: req.headers['x-refresh-token'], source: 'header' };
    }
    const cookies = parseCookies(req.headers.cookie);
    return { token: cookies.refreshToken, source: 'cookie' };
};

const setRefreshTokenCookie = (res, refreshToken) => {
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
};

const clearRefreshTokenCookie = (res) => {
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
};

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
        setRefreshTokenCookie(res, result.refreshToken);
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

const refresh = async (req, res, next) => {
    try {
        const { token, source } = getRefreshToken(req);
        const result = await authService.refresh(token, source);
        if (result.user && result.user.role !== 'driver') {
            setRefreshTokenCookie(res, result.refreshToken);
        }
        sendSuccess(res, 200, 'Token refreshed successfully', result);
    } catch (err) {
        clearRefreshTokenCookie(res);
        next(err);
    }
};

const logout = async (req, res, next) => {
    try {
        const { token } = getRefreshToken(req);
        await authService.logout(token);
        clearRefreshTokenCookie(res);
        sendSuccess(res, 200, 'Logout successful', null);
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
    resetPassword,
    refresh,
    logout
};
