// Permissions middleware for role-based access control

// Check if user has specific permission
exports.hasPermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      // Admin always has all permissions
      if (req.user.role === 'admin') {
        return next();
      }

      // Check if user has the required permission
      const permissions = req.user.permissions || {};
      const resourcePermissions = permissions[resource] || {};

      if (resourcePermissions[action] === true) {
        return next();
      }

      return res.status(403).json({
        status: 'error',
        message: `You do not have permission to ${action} ${resource}`
      });
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Permission check failed'
      });
    }
  };
};

// Check multiple permissions (user needs at least one)
exports.hasAnyPermission = (permissions) => {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'admin') {
        return next();
      }

      for (const { resource, action } of permissions) {
        const userPermissions = req.user.permissions || {};
        const resourcePermissions = userPermissions[resource] || {};
        if (resourcePermissions[action] === true) {
          return next();
        }
      }

      return res.status(403).json({
        status: 'error',
        message: 'You do not have the required permissions'
      });
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Permission check failed'
      });
    }
  };
};

// Check all permissions (user needs all)
exports.hasAllPermissions = (permissions) => {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'admin') {
        return next();
      }

      const userPermissions = req.user.permissions || {};
      
      for (const { resource, action } of permissions) {
        const resourcePermissions = userPermissions[resource] || {};
        if (resourcePermissions[action] !== true) {
          return res.status(403).json({
            status: 'error',
            message: `You do not have permission to ${action} ${resource}`
          });
        }
      }

      return next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Permission check failed'
      });
    }
  };
};

