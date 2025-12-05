const express = require('express');
const {
  getReferralCode,
  getReferralStats,
  trackReferral,
  getAllReferrals
} = require('../controllers/referralController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public route (for tracking during registration)
router.post('/track', trackReferral);

// Protected routes
router.get('/code', protect, getReferralCode);
router.get('/stats', protect, getReferralStats);

// Admin routes
router.get('/all', protect, authorize('admin'), getAllReferrals);

module.exports = router;

