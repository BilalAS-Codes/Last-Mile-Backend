const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const authRepository = require('./auth.repository');
const { sendOTP } = require('../../utils/mail');

const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

const generateRefreshTokenString = () => {
    return crypto.randomBytes(40).toString('hex');
};

const generateAccessToken = (userId, role) => {
    return jwt.sign(
        { id: userId, role: role.toLowerCase() },
        process.env.JWT_SECRET,
        { expiresIn: '1m' } // Short-lived access token
    );
};

const saveAndGenerateRefreshToken = async (userId, role) => {
    const plainToken = generateRefreshTokenString();
    const tokenHash = hashToken(plainToken);

    // Drivers keep their tokens indefinitely, others have a 7-day expiry
    let expiresAt;
    if (role.toLowerCase() === 'driver') {
        expiresAt = new Date(Date.now() + 1 * 365 * 24 * 60 * 60 * 1000); // 1 year
    } else {
        expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    }

    await authRepository.createRefreshToken(userId, tokenHash, expiresAt);
    return plainToken;
};

const register = async (userData) => {
    const { password, ...rest } = userData;

    console.log(userData, 'user')
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await authRepository.findByEmail(userData.email);
    if (user) {
        throw new Error('User already exists');
    }
    return await authRepository.createUser({ ...rest, password: hashedPassword });
};

const login = async (email, password) => {
    const user = await authRepository.findByEmail(email);
    if (!user) {
        throw new Error('Invalid credentials');
    }

    const role = user.role.toLowerCase();
    if (role === 'driver') {
        const error = new Error('Drivers are not allowed to access this portal');
        error.statusCode = 403;
        throw error;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error('Invalid credentials');
    }

    const accessToken = generateAccessToken(user.id, role);
    const refreshToken = await saveAndGenerateRefreshToken(user.id, role);

    return {
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            email: user.email,
            role,
            name: user.name
        }
    };
};

const driverLogin = async (email, password) => {
    const user = await authRepository.findByEmail(email);
    if (!user) {
        throw new Error('Invalid credentials');
    }

    const role = user.role.toLowerCase();
    if (role !== 'driver') {
        const error = new Error('Invalid credentials');
        error.statusCode = 401;
        throw error;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error('Invalid credentials');
    }

    const accessToken = generateAccessToken(user.id, 'driver');
    const refreshToken = await saveAndGenerateRefreshToken(user.id, 'driver');

    return {
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            email: user.email,
            role: 'driver',
            name: user.name
        }
    };
};

const getMe = async (userId) => {
    const user = await authRepository.findById(userId);
    if (user && user.role) {
        user.role = user.role.toLowerCase();
    }
    return user;
};

const forgotPassword = async (email) => {
    const user = await authRepository.findByEmail(email);
    if (!user) {
        throw new Error('User not found');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60000); // 10 minutes

    await authRepository.updateOTP(email, otp, expiry);
    await sendOTP(email, otp);

    return { message: 'OTP sent to email' };
};

const resetPassword = async (email, otp, newPassword) => {
    const user = await authRepository.verifyOTP(email, otp);
    if (!user) {
        throw new Error('Invalid or expired OTP');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await authRepository.updatePassword(email, hashedPassword);
    return { message: 'Password reset successful' };
};

const refresh = async (plainRefreshToken, source) => {
    if (!plainRefreshToken) {
        const message = source === 'cookie'
            ? 'Refresh token cookie is missing'
            : 'Refresh token is required';
        const error = new Error(message);
        error.statusCode = 401;
        throw error;
    }

    const tokenHash = hashToken(plainRefreshToken);
    const refreshTokenDoc = await authRepository.findRefreshToken(tokenHash);

    if (!refreshTokenDoc) {
        const error = new Error('Invalid refresh token');
        error.statusCode = 401;
        throw error;
    }

    const user = await authRepository.findById(refreshTokenDoc.user_id);
    if (!user || !user.active) {
        await authRepository.deleteUserRefreshTokens(refreshTokenDoc.user_id);
        const error = new Error('User is inactive or not found');
        error.statusCode = 401;
        throw error;
    }

    const role = user.role.toLowerCase();

    // Enforce role-based refresh token sources:
    // - Drivers: Must be in body or header (cannot use cookie)
    // - Admins/Clients: Must be in cookie (cannot use body/header)
    if (role === 'driver') {
        if (source === 'cookie') {
            const error = new Error('Drivers must provide refresh token in request body or headers');
            error.statusCode = 400;
            throw error;
        }
    } else {
        if (source !== 'cookie') {
            const error = new Error('Admins/Clients must provide refresh token in a cookie');
            error.statusCode = 400;
            throw error;
        }
    }

    // Check if revoked (reuse detection)
    if (refreshTokenDoc.is_revoked) {
        await authRepository.deleteUserRefreshTokens(user.id);
        const error = new Error('Token reuse detected. All sessions revoked.');
        error.statusCode = 401;
        throw error;
    }

    // Check absolute expiry
    const now = new Date();
    if (new Date(refreshTokenDoc.expires_at) < now) {
        await authRepository.deleteRefreshToken(tokenHash);
        const error = new Error('Refresh token has expired');
        error.statusCode = 401;
        throw error;
    }

    // Check sliding window inactivity timeout (Drivers exempt)
    if (role !== 'driver') {
        const lastActive = new Date(refreshTokenDoc.last_active_at).getTime();
        const inactiveTimeMs = now.getTime() - lastActive;

        let allowedInactiveMs;
        if (role === 'admin') {
            allowedInactiveMs = 24 * 60 * 60 * 1000; // 24 hours
        } else {
            allowedInactiveMs = 7 * 24 * 60 * 60 * 1000; // 7 days
        }

        if (inactiveTimeMs > allowedInactiveMs) {
            await authRepository.deleteRefreshToken(tokenHash);
            const error = new Error('Session expired due to inactivity');
            error.statusCode = 401;
            throw error;
        }
    }

    // Rotate token: Revoke old one and generate new one
    await authRepository.revokeRefreshToken(tokenHash);
    const newPlainRefreshToken = await saveAndGenerateRefreshToken(user.id, role);
    const newAccessToken = generateAccessToken(user.id, role);

    return {
        accessToken: newAccessToken,
        refreshToken: newPlainRefreshToken,
        user: {
            id: user.id,
            email: user.email,
            role,
            name: user.name
        }
    };
};

const logout = async (plainRefreshToken) => {
    if (!plainRefreshToken) return;
    const tokenHash = hashToken(plainRefreshToken);
    await authRepository.deleteRefreshToken(tokenHash);
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
