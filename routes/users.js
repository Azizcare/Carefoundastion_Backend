const express = require('express');
const { protect } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validation');
const {
  getProfile,
  updateProfile,
  getUserCampaigns,
  getUserDonations,
  getUserCoupons,
  submitKYC,
  getKYCStatus,
  updateNotificationPreferences,
  updatePrivacyPreferences,
  getDashboardStats,
  deleteAccount,
  generateReferralLink,
  getReferrals,
  requestWithdrawal,
  getWithdrawals,
  downloadUserDonationsReport
} = require('../controllers/userController');
const {
  getNotificationPreferences,
  updateNotificationPreferences: updateNotificationPrefs
} = require('../controllers/notificationPreferencesController');

const router = express.Router();

// All user routes require authentication
router.use(protect);

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', getProfile);

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', updateProfile);

// @desc    Get user dashboard stats
// @route   GET /api/users/dashboard
// @access  Private
router.get('/dashboard', getDashboardStats);

// @desc    Get user campaigns
// @route   GET /api/users/campaigns
// @access  Private
router.get('/campaigns', validatePagination, getUserCampaigns);

// @desc    Download user donations report
// @route   GET /api/users/donations/report
// @access  Private
// NOTE: This must come BEFORE /donations route to avoid route conflict
router.get('/donations/report', downloadUserDonationsReport);

// @desc    Get user donations
// @route   GET /api/users/donations
// @access  Private
router.get('/donations', validatePagination, getUserDonations);

// @desc    Get user coupons
// @route   GET /api/users/coupons
// @access  Private
router.get('/coupons', validatePagination, getUserCoupons);

// KYC routes
// @desc    Submit KYC documents
// @route   POST /api/users/kyc
// @access  Private
router.post('/kyc', submitKYC);

// @desc    Upload KYC document (alias for submitKYC)
// @route   POST /api/users/kyc/upload
// @access  Private
router.post('/kyc/upload', submitKYC);

// @desc    Get KYC status
// @route   GET /api/users/kyc/status
// @access  Private
router.get('/kyc/status', getKYCStatus);

// Preferences routes
// @desc    Get notification preferences
// @route   GET /api/users/notifications/preferences
// @access  Private
router.get('/notifications/preferences', getNotificationPreferences);

// @desc    Update notification preferences
// @route   PUT /api/users/notifications/preferences
// @access  Private
router.put('/notifications/preferences', updateNotificationPrefs);

// @desc    Update notification preferences (legacy route)
// @route   PUT /api/users/preferences/notifications
// @access  Private
router.put('/preferences/notifications', updateNotificationPreferences);

// @desc    Update privacy preferences
// @route   PUT /api/users/preferences/privacy
// @access  Private
router.put('/preferences/privacy', updatePrivacyPreferences);

// @desc    Delete user account
// @route   DELETE /api/users/account
// @access  Private
router.delete('/account', deleteAccount);

// Referral routes
// @desc    Generate referral link
// @route   POST /api/users/referrals/generate
// @access  Private
router.post('/referrals/generate', generateReferralLink);

// @desc    Get user referrals
// @route   GET /api/users/referrals
// @access  Private
router.get('/referrals', getReferrals);

// Withdrawal routes
// @desc    Request withdrawal
// @route   POST /api/users/withdrawals/request
// @access  Private
router.post('/withdrawals/request', requestWithdrawal);

// @desc    Get user withdrawals
// @route   GET /api/users/withdrawals
// @access  Private
router.get('/withdrawals', getWithdrawals);

module.exports = router;
