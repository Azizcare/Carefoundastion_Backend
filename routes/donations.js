const express = require('express');
const { protect, optionalAuth } = require('../middleware/auth');
const { validateDonation, validatePagination, validateObjectId } = require('../middleware/validation');
const {
  getDonations,
  getDonation,
  createDonation,
  createTestDonation,
  getReceipt,
  requestRefund,
  getDonationStats,
  getMyDonations
} = require('../controllers/donationController');

const router = express.Router();

// @desc    Get donation statistics (must be before /:id)
// @route   GET /api/donations/stats/overview
// @access  Public
router.get('/stats/overview', getDonationStats);

// @desc    Get user's donations
// @route   GET /api/donations/my-donations
// @access  Private
router.get('/my-donations', protect, validatePagination, getMyDonations);

// @desc    Get all donations (Public with pagination)
// @route   GET /api/donations
// @access  Public
router.get('/', optionalAuth, validatePagination, getDonations);

// @desc    Get single donation
// @route   GET /api/donations/:id
// @access  Private
router.get('/:id', protect, validateObjectId(), getDonation);

// @desc    Create new donation
// @route   POST /api/donations
// @access  Private
router.post('/', protect, validateDonation, createDonation);

// @desc    Create test donation (without payment gateway)
// @route   POST /api/donations/test
// @access  Private
router.post('/test', protect, createTestDonation);

// @desc    Get donation receipt
// @route   GET /api/donations/:id/receipt
// @access  Private
router.get('/:id/receipt', protect, validateObjectId(), getReceipt);

// @desc    Request donation refund
// @route   POST /api/donations/:id/refund
// @access  Private
router.post('/:id/refund', protect, validateObjectId(), requestRefund);

module.exports = router;



