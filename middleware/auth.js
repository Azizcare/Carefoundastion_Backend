const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  try {
    // Check JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured in environment variables');
      return res.status(500).json({
        status: 'error',
        message: 'Server configuration error. Please contact administrator.'
      });
    }

    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check for token in cookies
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Access denied. No token provided. Please login first.'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (!decoded || !decoded.id) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid token format.'
        });
      }
      
      // Get user from database
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'Token is valid but user no longer exists.'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          status: 'error',
          message: 'Account is deactivated.'
        });
      }

      req.user = user;
      next();
    } catch (error) {
      // JWT verification error
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid token.'
        });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: 'error',
          message: 'Token has expired. Please login again.'
        });
      }
      console.error('Token verification error:', error);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token.'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      status: 'error',
      message: 'Server error in authentication.',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Access denied. Please login first.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `Access denied. Role '${req.user.role}' is not authorized to access this resource.`
      });
    }

    next();
  };
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (user && user.isActive) {
          req.user = user;
        }
      } catch (error) {
        // Token is invalid, but we don't fail the request
        console.log('Invalid token in optional auth:', error.message);
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue even if there's an error
  }
};

// Check if user is verified
const requireVerification = (req, res, next) => {
  if (!req.user.isVerified) {
    return res.status(403).json({
      status: 'error',
      message: 'Account verification required. Please verify your email address.'
    });
  }
  next();
};

// Check if user has completed KYC
const requireKYC = (req, res, next) => {
  if (!req.user.kyc.isCompleted) {
    return res.status(403).json({
      status: 'error',
      message: 'KYC verification required. Please complete your KYC process.'
    });
  }
  next();
};

// Rate limiting for specific user actions
const userActionLimit = (maxActions = 5, windowMs = 15 * 60 * 1000) => {
  const userActions = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user._id.toString();
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (userActions.has(userId)) {
      const actions = userActions.get(userId).filter(time => time > windowStart);
      userActions.set(userId, actions);
    } else {
      userActions.set(userId, []);
    }

    const userActionTimes = userActions.get(userId);

    if (userActionTimes.length >= maxActions) {
      return res.status(429).json({
        status: 'error',
        message: `Too many actions. Please wait ${Math.ceil((userActionTimes[0] + windowMs - now) / 1000)} seconds.`
      });
    }

    userActionTimes.push(now);
    next();
  };
};

// Check if user owns the resource
const checkOwnership = (resourceModel, paramName = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramName];
      const resource = await resourceModel.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          status: 'error',
          message: 'Resource not found.'
        });
      }

      // Check if user owns the resource or is admin
      if (resource.fundraiser && resource.fundraiser.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied. You can only access your own resources.'
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Server error in ownership verification.'
      });
    }
  };
};

module.exports = {
  protect,
  authorize,
  optionalAuth,
  requireVerification,
  requireKYC,
  userActionLimit,
  checkOwnership
};






