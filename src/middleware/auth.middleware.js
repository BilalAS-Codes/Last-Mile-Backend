const jwt = require('jsonwebtoken');


const protect = (req, res, next) => {
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
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token is invalid or expired' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        const userRole = (req.user.role || '').toUpperCase();
        const allowedRoles = roles.map(r => r.toUpperCase());

        console.log(`[Auth] User Role: ${userRole}, Allowed Roles: ${allowedRoles}`);

        // ADMIN always has access to everything
        if (userRole === 'ADMIN' || allowedRoles.includes(userRole)) {
            return next();
        }

        return res.status(403).json({
            error: `User role ${req.user.role} is not authorized to access this route`,
        });
    };
};

module.exports = { protect, authorize };
