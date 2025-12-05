const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    const combinedMessage = errorMessages.length === 1 
      ? errorMessages[0] 
      : errorMessages.join('. ');
    
    console.error('=== EXPRESS-VALIDATOR ERRORS ===');
    console.error('Request body:', req.body);
    console.error('Validation errors:', errors.array());
    console.error('Combined message:', combinedMessage);
    
    return res.status(400).json({
      status: 'error',
      message: combinedMessage || 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// User validation rules
const validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .optional() // Make password optional (for volunteers with default password)
    .custom((value, { req }) => {
      // If password is provided, validate it
      if (value) {
        if (value.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }
        // Only enforce complexity for non-volunteer roles
        if (req.body.role !== 'volunteer') {
          if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
            throw new Error('Password must contain at least one lowercase letter, one uppercase letter, and one number');
          }
        }
      }
      return true;
    }),
  
  body('phone')
    .matches(/^\d{10}$/)
    .withMessage('Please provide a valid 10-digit phone number'),
  
  body('role')
    .optional()
    .isIn(['donor', 'fundraiser', 'partner', 'admin', 'volunteer'])
    .withMessage('Invalid role specified. Allowed roles: donor, fundraiser, partner, admin, volunteer'),
  
  handleValidationErrors
];

const validateUserLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail({ gmail_remove_dots: false }), // Normalize but don't do complex transformations
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Campaign validation rules
const validateCampaignCreation = [
  body('title')
    .trim()
    .isLength({ min: 10, max: 100 })
    .withMessage('Title must be between 10 and 100 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Description is required and cannot exceed 5000 characters'),
  
  body('shortDescription')
    .trim()
    .isLength({ min: 20, max: 200 })
    .withMessage('Short description must be between 20 and 200 characters'),
  
  body('category')
    .isIn(['medical', 'education', 'disaster', 'emergency', 'animal', 'environment', 'sports', 'technology', 'other'])
    .withMessage('Invalid category specified'),
  
  body('goalAmount')
    .isFloat({ min: 100 })
    .withMessage('Goal amount must be at least ₹100'),
  
  body('timeline.endDate')
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      const endDate = new Date(value);
      const now = new Date();
      const maxDate = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year from now
      
      // Check if endDate is after startDate
      if (req.body.timeline?.startDate) {
        const startDate = new Date(req.body.timeline.startDate);
        if (endDate <= startDate) {
          throw new Error('End date must be after start date');
        }
      }
      
      if (endDate <= now) {
        throw new Error('End date must be in the future');
      }
      if (endDate > maxDate) {
        throw new Error('End date cannot be more than 1 year from now');
      }
      return true;
    }),
  
  body('beneficiary.name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Beneficiary name must be between 2 and 50 characters'),
  
  body('beneficiary.relationship')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Relationship must be between 2 and 50 characters'),
  
  handleValidationErrors
];

const validateCampaignUpdate = [
  param('id')
    .isMongoId()
    .withMessage('Invalid campaign ID'),
  
  body('title')
    .optional()
    .trim()
    .isLength({ min: 10, max: 100 })
    .withMessage('Title must be between 10 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Description cannot exceed 5000 characters'),
  
  body('goalAmount')
    .optional()
    .isFloat({ min: 100 })
    .withMessage('Goal amount must be at least ₹100'),
  
  handleValidationErrors
];

// Donation validation rules
const validateDonation = [
  body('campaignId')
    .isMongoId()
    .withMessage('Invalid campaign ID'),
  
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Donation amount must be at least ₹1'),
  
  body('paymentMethod')
    .isIn(['razorpay', 'stripe', 'upi', 'netbanking', 'card', 'wallet'])
    .withMessage('Invalid payment method'),
  
  body('isAnonymous')
    .optional()
    .isBoolean()
    .withMessage('isAnonymous must be a boolean value'),
  
  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Message cannot exceed 500 characters'),
  
  handleValidationErrors
];

// Coupon validation rules
const validateCouponCreation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  
  body('category')
    .isIn(['food_server', 'restaurant', 'food_grain_supplier', 'pathology_lab', 'hospital', 'milk_bread_vendor', 'food', 'medical', 'education', 'transport', 'clothing', 'other'])
    .withMessage('Invalid category specified'),
  
  body('type')
    .isIn(['discount', 'cashback', 'free_item', 'service'])
    .withMessage('Invalid coupon type'),
  
  body('value')
    .custom((value, { req }) => {
      if (!value) {
        throw new Error('Coupon value is required');
      }
      
      const couponType = req.body.type;
      
      // For free_item and service, amount is a text description
      if (couponType === 'free_item' || couponType === 'service') {
        if (!value.amount || typeof value.amount !== 'string' || value.amount.trim().length === 0) {
          throw new Error('Description is required for this coupon type');
        }
        return true;
      }
      
      // For discount and cashback types, need either amount or percentage
      const hasAmount = value.amount && !isNaN(value.amount) && parseFloat(value.amount) >= 1;
      const hasPercentage = value.percentage && !isNaN(value.percentage);
      
      if (!hasAmount && !hasPercentage) {
        throw new Error('Either amount (₹) or percentage (%) must be provided');
      }
      
      if (hasAmount && parseFloat(value.amount) < 1) {
        throw new Error('Coupon value must be at least ₹1');
      }
      
      if (hasPercentage) {
        const percentage = parseFloat(value.percentage);
        if (percentage < 1 || percentage > 100) {
          throw new Error('Percentage must be between 1 and 100');
        }
      }
      
      return true;
    }),
  
  body('validity.startDate')
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  body('validity.endDate')
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      const startDate = new Date(req.body.validity.startDate);
      const endDate = new Date(value);
      
      if (endDate <= startDate) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  
  body('usage.maxUses')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Maximum uses must be at least 1'),
  
  handleValidationErrors
];

// Partner validation rules
const validatePartnerRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('phone')
    .matches(/^\d{10}$/)
    .withMessage('Please provide a valid 10-digit phone number'),
  
  body('businessType')
    .isIn(['restaurant', 'hospital', 'clinic', 'pharmacy', 'school', 'college', 'ngo', 'retail', 'service', 'other'])
    .withMessage('Invalid business type'),
  
  body('category')
    .isIn(['food', 'medical', 'education', 'transport', 'clothing', 'other'])
    .withMessage('Invalid category'),
  
  body('description')
    .trim()
    .isLength({ min: 20, max: 1000 })
    .withMessage('Description must be between 20 and 1000 characters'),
  
  body('address.street')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Street address must be between 5 and 200 characters'),
  
  body('address.city')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters'),
  
  body('address.state')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('State must be between 2 and 50 characters'),
  
  body('address.pincode')
    .matches(/^\d{6}$/)
    .withMessage('Pincode must be a valid 6-digit number'),
  
  handleValidationErrors
];

// Query validation rules
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

const validateSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters'),
  
  query('category')
    .optional()
    .custom((value) => {
      if (value === '') return true; // Allow empty string
      const validCategories = ['medical', 'education', 'disaster', 'animal', 'environment', 'sports', 'technology', 'other', 'emergency', 'memorial', 'nonprofit', 'community'];
      return validCategories.includes(value);
    })
    .withMessage('Invalid category filter'),
  
  query('sortBy')
    .optional()
    .custom((value) => {
      // Allow both 'field' and '-field' (descending) format
      const field = value.startsWith('-') ? value.substring(1) : value;
      const validFields = ['createdAt', 'goalAmount', 'currentAmount', 'endDate', 'popularity'];
      return validFields.includes(field);
    })
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  
  query('search')
    .optional()
    .custom((value) => {
      if (value === '') return true; // Allow empty string
      return value.length >= 2 && value.length <= 100;
    })
    .withMessage('Search query must be between 2 and 100 characters'),
  
  query('status')
    .optional()
    .custom((value) => {
      if (value === '') return true; // Allow empty string
      const validStatuses = ['active', 'pending', 'completed', 'rejected', 'paused'];
      return validStatuses.includes(value);
    })
    .withMessage('Invalid status filter'),
  
  handleValidationErrors
];

// MongoDB ObjectId validation
const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName}`),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateCampaignCreation,
  validateCampaignUpdate,
  validateDonation,
  validateCouponCreation,
  validatePartnerRegistration,
  validatePagination,
  validateSearch,
  validateObjectId
};



