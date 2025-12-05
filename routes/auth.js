const express = require('express');
const {
  register,
  login,
  logout,
  getMe,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  sendOTP,
  verifyOTP
} = require('../controllers/authController');
const {
  enable2FA,
  verify2FA,
  disable2FA,
  verifyLogin2FA,
  get2FAStatus,
  regenerateBackupCodes
} = require('../controllers/twoFactorAuthController');
const { protect } = require('../middleware/auth');
const {
  validateUserRegistration,
  validateUserLogin
} = require('../middleware/validation');

const router = express.Router();

// Add logging middleware for login route
const logLoginRequest = (req, res, next) => {
  console.log('=== LOGIN ROUTE HIT ===');
  console.log('Method:', req.method);
  console.log('Path:', req.path);
  console.log('Body received:', !!req.body);
  console.log('Content-Type:', req.get('Content-Type'));
  next();
};

// Public routes
router.post('/register', validateUserRegistration, register);
router.post('/login', logLoginRequest, validateUserLogin, login);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/2fa/verify-login', verifyLogin2FA);
router.get('/verifyemail/:token', verifyEmail);
router.put('/resetpassword/:resettoken', resetPassword);
router.post('/forgotpassword', forgotPassword);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);
router.post('/resendverification', protect, resendVerification);

// 2FA routes
router.post('/2fa/enable', protect, enable2FA);
router.post('/2fa/verify', protect, verify2FA);
router.post('/2fa/disable', protect, disable2FA);
router.get('/2fa/status', protect, get2FAStatus);
router.post('/2fa/regenerate-backup-codes', protect, regenerateBackupCodes);

module.exports = router;






