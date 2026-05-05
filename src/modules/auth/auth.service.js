const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRepository = require('./auth.repository');
const { sendOTP } = require('../../utils/mail');


class AuthService {
    async register(userData) {
        const { password, ...rest } = userData;
        const hashedPassword = await bcrypt.hash(password, 10);
        return await authRepository.createUser({ ...rest, password: hashedPassword });
    }

    async login(email, password) {
        const user = await authRepository.findByEmail(email);
        if (!user) {
            throw new Error('Invalid credentials');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error('Invalid credentials');
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.name
            }
        };
    }

    async getMe(userId) {
        return await authRepository.findById(userId);
    }

    async forgotPassword(email) {
        const user = await authRepository.findByEmail(email);
        console.log(user, 'user');
        if (!user) {
            throw new Error('User not found');
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 10 * 60000); // 10 minutes

        await authRepository.updateOTP(email, otp, expiry);
        await sendOTP(email, otp);
        console.log(otp, 'otp');

        return { message: 'OTP sent to email' };
    }

    async resetPassword(email, otp, newPassword) {
        const user = await authRepository.verifyOTP(email, otp);
        if (!user) {
            throw new Error('Invalid or expired OTP');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await authRepository.updatePassword(email, hashedPassword);
        return { message: 'Password reset successful' };
    }
}

module.exports = new AuthService();
