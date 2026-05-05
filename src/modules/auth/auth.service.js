const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRepository = require('./auth.repository');


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
}

module.exports = new AuthService();
