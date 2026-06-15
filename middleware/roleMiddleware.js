/**
 * Role-based access control middleware
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 * @returns {Function} Express middleware function
 */
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required' 
      });
    }

    // Check if user's role is in allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        message: `Access denied. This route requires ${allowedRoles.join(' or ')} role.`,
        yourRole: req.user.role,
        requiredRoles: allowedRoles
      });
    }

    // User has correct role, proceed
    next();
  };
};

module.exports = checkRole;