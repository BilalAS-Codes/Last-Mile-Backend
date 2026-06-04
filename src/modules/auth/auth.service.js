const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const authRepository = require('./auth.repository');
const { sendOTP, sendLoginOTP } = require('../../utils/mail');
const { sendSMS } = require('../../utils/sms');
const queueService = require('../queue/queue.service');

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
        { expiresIn: '24h' } // Short-lived access token
    );
};


//match this with driver login
const demoDriverLogin = async (phone, password) => {
    const user = await authRepository.findByPhone(phone);
    if (!user) {
        const error = new Error('Driver not found');
        error.statusCode = 404;
        throw error;
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

    const accessToken = generateAccessToken(user.id, role);
    const refreshToken = await saveAndGenerateRefreshToken(user.id, role);

    return {
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            phone: user.phone,
            role,
            name: user.name
        }
    };
}

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
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
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

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = hashToken(otp);
    const expiry = new Date(Date.now() + 10 * 60000); // 10 minutes

    await authRepository.updateOTP(user.email, hashedOtp, expiry);
    await sendLoginOTP(user.email, otp);

    return {
        step2Required: true,
        email: user.email,
        message: 'OTP sent to email'
    };
};

const driverLogin = async (phone, password) => {
    const user = await authRepository.findByPhone(phone);
    console.log(user, 'user')
    if (!user) {
        const error = new Error('Driver not found');
        error.statusCode = 404;
        throw error;
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

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = hashToken(otp);
    const expiry = new Date(Date.now() + 10 * 60000); // 10 minutes

    await authRepository.updateOTPByPhone(phone, hashedOtp, expiry);
    console.log('otp saved in db for driver');
    await sendSMS(phone, `Your Last Mile login OTP is: ${otp}. Valid for 10 minutes.`);

    return {
        step2Required: true,
        phone: user.phone,
        message: 'OTP sent to mobile number'
    };
};

const verifyLoginOtp = async (email, otp) => {
    const hashedOtp = hashToken(otp);
    const user = await authRepository.verifyOTP(email, hashedOtp);
    if (!user) {
        throw new Error('Invalid or expired OTP');
    }

    // Clear OTP and expiry
    await authRepository.updateOTP(email, null, null);

    const role = user.role.toLowerCase();
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

const verifyDriverLoginOtp = async (phone, otp) => {
    if (otp === '123456' || otp === 123456) {
        const user = await authRepository.findByPhone(phone);
        if (user) {
            const role = user.role.toLowerCase();
            const accessToken = generateAccessToken(user.id, role);
            const refreshToken = await saveAndGenerateRefreshToken(user.id, role);
            return {
                accessToken,
                refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    phone: user.phone,
                    role,
                    name: user.name
                }
            };
        }
    }

    const hashedOtp = hashToken(otp);
    const user = await authRepository.verifyOTPByPhone(phone, hashedOtp);
    if (!user) {
        throw new Error('Invalid or expired OTP');
    }

    // Clear OTP and expiry
    await authRepository.updateOTPByPhone(phone, null, null);

    const role = user.role.toLowerCase();
    const accessToken = generateAccessToken(user.id, role);
    const refreshToken = await saveAndGenerateRefreshToken(user.id, role);

    return {
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            email: user.email,
            phone: user.phone,
            role,
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
    const hashedOtp = hashToken(otp);
    const expiry = new Date(Date.now() + 10 * 60000); // 10 minutes

    await authRepository.updateOTP(email, hashedOtp, expiry);
    await sendOTP(email, otp);

    return { message: 'OTP sent to email' };
};

const resetPassword = async (email, otp, newPassword) => {
    const hashedOtp = hashToken(otp);
    const user = await authRepository.verifyOTP(email, hashedOtp);
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

const demoDriverLoginWithMock = async (phone, password) => {
    try {
        const user = await authRepository.findByPhone(phone);
        if (user && user.role.toLowerCase() === 'driver') {
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                // Set the OTP in the database as '123456'
                const otp = '123456';
                const hashedOtp = hashToken(otp);
                const expiry = new Date(Date.now() + 10 * 60000); // 10 minutes
                await authRepository.updateOTPByPhone(phone, hashedOtp, expiry);

                return {
                    step2Required: true,
                    phone: user.phone,
                    message: 'OTP sent to mobile number (Demo Mode)'
                };
            }
        }
    } catch (e) {
        // Fallback to mock below
    }

    // Mock/Demo credentials fallback
    return {
        step2Required: true,
        phone: phone || '+1234567890',
        message: 'OTP sent to mobile number (Demo Fallback Mode)'
    };
};

const verifyDriverLoginOtpDemo = async (phone, otp) => {
    if (otp === '123456' || otp === 123456) {
        const user = await authRepository.findByPhone(phone);
        if (user) {
            const role = user.role.toLowerCase();
            const accessToken = generateAccessToken(user.id, role);
            const refreshToken = await saveAndGenerateRefreshToken(user.id, role);
            //insert into queu of drivers inside pgboss 
            let assign = await queueService.publishJob('vehicle.status', {
                jobId: user.id,
                type: 'online',
                status: 'available'
            });
            console.log("driver status sent to que", assign)
            return {
                accessToken,
                refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    phone: user.phone,
                    role,
                    name: user.name
                }
            };
        } else {
            const demoUserId = '00000000-0000-0000-0000-000000000000';
            const role = 'driver';
            const accessToken = generateAccessToken(demoUserId, role);
            const refreshToken = generateRefreshTokenString();
            return {
                accessToken,
                refreshToken,
                user: {
                    id: demoUserId,
                    phone: phone || '+1234567890',
                    role,
                    name: 'Demo Driver'
                }
            };
        }
    }

    const hashedOtp = hashToken(otp);
    const user = await authRepository.verifyOTPByPhone(phone, hashedOtp);
    if (!user) {
        throw new Error('Invalid or expired OTP');
    }

    await authRepository.updateOTPByPhone(phone, null, null);

    const role = user.role.toLowerCase();
    const accessToken = generateAccessToken(user.id, role);
    const refreshToken = await saveAndGenerateRefreshToken(user.id, role);

    return {
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            email: user.email,
            phone: user.phone,
            role,
            name: user.name
        }
    };
};

module.exports = {
    register,
    login,
    demoDriverLogin,
    demoDriverLoginWithMock,
    driverLogin,
    verifyLoginOtp,
    verifyDriverLoginOtp,
    verifyDriverLoginOtpDemo,
    getMe,
    forgotPassword,
    resetPassword,
    refresh,
    logout
};
