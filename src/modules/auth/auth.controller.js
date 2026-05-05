const authService = require('./auth.service');

class AuthController {
    async register(req, res, next) {
        try {
            const user = await authService.register(req.body);
            res.status(201).json({
                success: true,
                data: user
            });
        } catch (err) {
            next(err);
        }
    }

    async login(req, res, next) {
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
    }

    async getMe(req, res, next) {
        try {
            const user = await authService.getMe(req.user.id);
            res.status(200).json({
                success: true,
                data: user
            });
        } catch (err) {
            next(err);
        }
    }

    async forgotPassword(req, res, next) {
        try {
            const { email } = req.body;
            console.log(email, 'email');
            const result = await authService.forgotPassword(email);
            res.status(200).json({
                success: true,
                ...result
            });
        } catch (err) {
            next(err);
        }
    }

    async resetPassword(req, res, next) {
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
    }
}

module.exports = new AuthController();
