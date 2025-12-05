const express = require('express');
const { protect } = require('../middleware/auth');
const { validateDonation } = require('../middleware/validation');
const {
  createRazorpayOrder,
  verifyRazorpayPayment,
  createStripeIntent,
  confirmStripePayment,
  processUPIPayment,
  getPaymentMethods,
  getPaymentStatus,
  razorpayWebhook,
  stripeWebhook
} = require('../controllers/paymentController');

const router = express.Router();

// Public routes
// @desc    Get payment methods
// @route   GET /api/payments/methods
// @access  Public
router.get('/methods', getPaymentMethods);

// Webhook routes (must be before other routes)
// @desc    Razorpay webhook
// @route   POST /api/payments/razorpay/webhook
// @access  Public (with signature verification)
router.post('/razorpay/webhook', express.raw({ type: 'application/json' }), razorpayWebhook);

// @desc    Stripe webhook
// @route   POST /api/payments/stripe/webhook
// @access  Public (with signature verification)
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// Razorpay routes
// @desc    Create Razorpay order
// @route   POST /api/payments/razorpay/create-order
// @access  Private
router.post('/razorpay/create-order', protect, createRazorpayOrder);

// @desc    Verify Razorpay payment
// @route   POST /api/payments/razorpay/verify
// @access  Private
router.post('/razorpay/verify', protect, verifyRazorpayPayment);

// Stripe routes
// @desc    Create Stripe payment intent
// @route   POST /api/payments/stripe/create-intent
// @access  Private
router.post('/stripe/create-intent', protect, createStripeIntent);

// @desc    Confirm Stripe payment
// @route   POST /api/payments/stripe/confirm
// @access  Private
router.post('/stripe/confirm', protect, confirmStripePayment);

// UPI routes
// @desc    Process UPI payment
// @route   POST /api/payments/upi/process
// @access  Private
router.post('/upi/process', protect, processUPIPayment);

// @desc    Get payment status
// @route   GET /api/payments/status/:transactionId
// @access  Private
router.get('/status/:transactionId', protect, getPaymentStatus);

module.exports = router;



