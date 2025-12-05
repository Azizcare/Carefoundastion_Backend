const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  sendSMS,
  sendDonationReceiptSMS,
  sendCampaignApprovalSMS,
  sendOTP,
  sendBulkSMS
} = require('../controllers/smsController');

const router = express.Router();

// @desc    Send SMS
// @route   POST /api/sms/send
// @access  Private
router.post('/send', protect, sendSMS);

// @desc    Send donation receipt SMS
// @route   POST /api/sms/donation-receipt
// @access  Private
router.post('/donation-receipt', protect, sendDonationReceiptSMS);

// @desc    Send campaign approval SMS
// @route   POST /api/sms/campaign-approval
// @access  Private (Admin)
router.post('/campaign-approval', protect, authorize('admin'), sendCampaignApprovalSMS);

// @desc    Send OTP SMS
// @route   POST /api/sms/send-otp
// @access  Public
router.post('/send-otp', sendOTP);

// @desc    Send bulk SMS
// @route   POST /api/sms/send-bulk
// @access  Private (Admin)
router.post('/send-bulk', protect, authorize('admin'), sendBulkSMS);

module.exports = router;











