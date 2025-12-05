const User = require('../models/User');

// Middleware to automatically upgrade user to fundraiser when creating campaign
const autoUpgradeFundraiser = async (req, res, next) => {
  try {
    // If user is already fundraiser or admin, continue
    if (req.user.role === 'fundraiser' || req.user.role === 'admin') {
      return next();
    }

    // If user is donor, upgrade to fundraiser
    if (req.user.role === 'donor') {
      const user = await User.findById(req.user._id);
      
      if (user) {
        user.role = 'fundraiser';
        await user.save();
        
        // Update req.user for current request
        req.user.role = 'fundraiser';
        
        console.log(`✅ User ${user.email} upgraded to fundraiser`);
      }
    }

    next();
  } catch (error) {
    console.error('Auto-upgrade error:', error);
    // Don't fail the request if upgrade fails
    next();
  }
};

module.exports = { autoUpgradeFundraiser };










