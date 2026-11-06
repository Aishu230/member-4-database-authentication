/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts access to specified roles (e.g. 'owner', 'manager', 'employee')
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before checking permissions.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user.role}' is not authorized to perform this action. Required: [${roles.join(', ')}]`,
      });
    }

    next();
  };
};

/**
 * Multi-Tenant Scoping Middleware
 * Automatically injects the user's organizationId into query/body filters to prevent cross-tenant data leaks
 */
const scopeToOrganization = (req, res, next) => {
  if (!req.user || !req.user.organization) {
    return res.status(400).json({
      success: false,
      message: 'Active organization context is missing for this user.',
    });
  }

  // Inject user's organization ID
  req.organizationId = req.user.organization._id || req.user.organization;
  next();
};

module.exports = {
  authorizeRoles,
  scopeToOrganization,
};
