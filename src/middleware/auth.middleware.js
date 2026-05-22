const jwt = require('jsonwebtoken');
const authRepository = require('../modules/auth/auth.repository');


const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ error: 'Not authorized to access this route' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verify user exists and is active
        const user = await authRepository.findById(decoded.id);
        if (!user || !user.active) {
            return res.status(401).json({ error: 'User is inactive or deleted' });
        }

        req.user = {
            id: user.id,
            role: user.role.toLowerCase(),
            name: user.name,
            email: user.email
        };
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token is invalid or expired' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        const userRole = (req.user.role || '').toLowerCase();
        const allowedRoles = roles.map(r => r.toLowerCase());

        console.log(`[Auth] User Role: ${userRole}, Allowed Roles: ${allowedRoles}`);

        // admin always has access to everything
        if (userRole === 'admin' || allowedRoles.includes(userRole)) {
            return next();
        }

        return res.status(403).json({
            error: `User role ${req.user.role} is not authorized to access this route`,
        });
    };
};

module.exports = { protect, authorize };
