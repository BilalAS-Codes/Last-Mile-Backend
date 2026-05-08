const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRepository = require('./auth.repository');
const { sendOTP } = require('../../utils/mail');

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

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error('Invalid credentials');
    }

    const token = jwt.sign(
        { id: user.id, role: user.role.toLowerCase() },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    return {
        token,
        user: {
            id: user.id,
            email: user.email,
            role: user.role.toLowerCase(),
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

module.exports = {
    register,
    login,
    getMe,
    forgotPassword,
    resetPassword
};
