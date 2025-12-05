const Razorpay = require('razorpay');
const Stripe = require('stripe');
const crypto = require('crypto');
const Campaign = require('../models/Campaign');
const Donation = require('../models/Donation');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'test_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'test_secret'
});

// Initialize Stripe
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'test_secret');

// @desc    Create Razorpay order
// @route   POST /api/payments/razorpay/create-order
// @access  Private
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { amount, campaignId, currency = 'INR' } = req.body;

    if (!amount || !campaignId) {
      return res.status(400).json({
        status: 'error',
        message: 'Amount and campaign ID are required'
      });
    }

    // Validate campaign
    const campaign = await Campaign.findById(campaignId);
    if (!campaign || campaign.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: 'Campaign is not available for donations'
      });
    }

    // Create Razorpay order
    const options = {
      amount: amount * 100, // Convert to paise
      currency: currency,
      receipt: `receipt_${Date.now()}`,
      notes: {
        campaignId: campaignId,
        userId: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email
      }
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      status: 'success',
      message: 'Razorpay order created successfully',
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID || orderResponse?.data?.keyId || 'rzp_test_key',
        campaignTitle: campaign.title
      }
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create payment order'
    });
  }
};

// @desc    Verify Razorpay payment
// @route   POST /api/payments/razorpay/verify
// @access  Private
exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      campaignId,
      amount,
      isAnonymous,
      message
    } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'test_secret')
      .update(body.toString())
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Payment verification failed'
      });
    }

    // Fetch payment details from Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    // Create donation
    const donation = await Donation.create({
      donor: req.user.id,
      campaign: campaignId,
      amount: amount,
      currency: payment.currency.toUpperCase(),
      paymentMethod: 'razorpay',
      paymentDetails: {
        transactionId: razorpay_payment_id,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        gateway: 'razorpay',
        gatewayResponse: payment
      },
      status: 'completed',
      isAnonymous: isAnonymous || false,
      message: message || '',
      donorDetails: {
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone
      }
    });

    // Calculate fees
    donation.calculateFees();
    await donation.save();

    // Update campaign
    const campaign = await Campaign.findById(campaignId);
    campaign.currentAmount += amount;
    campaign.analytics.donations += 1;
    campaign.lastDonationDate = new Date();

    // Recalculate average
    const totalDonations = await Donation.countDocuments({
      campaign: campaignId,
      status: 'completed'
    });
    campaign.analytics.avgDonationAmount = Math.round(campaign.currentAmount / totalDonations);

    await campaign.save();

    res.status(200).json({
      status: 'success',
      message: 'Payment verified and donation recorded successfully',
      data: {
        donationId: donation._id,
        receiptNumber: donation.receipt.receiptNumber
      }
    });
  } catch (error) {
    console.error('Verify Razorpay payment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to verify payment'
    });
  }
};

// @desc    Create Stripe payment intent
// @route   POST /api/payments/stripe/create-intent
// @access  Private
exports.createStripeIntent = async (req, res) => {
  try {
    const { amount, campaignId, currency = 'inr' } = req.body;

    if (!amount || !campaignId) {
      return res.status(400).json({
        status: 'error',
        message: 'Amount and campaign ID are required'
      });
    }

    // Validate campaign
    const campaign = await Campaign.findById(campaignId);
    if (!campaign || campaign.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: 'Campaign is not available for donations'
      });
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to smallest currency unit
      currency: currency,
      metadata: {
        campaignId: campaignId,
        userId: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email
      },
      description: `Donation to ${campaign.title}`
    });

    res.status(200).json({
      status: 'success',
      message: 'Stripe payment intent created successfully',
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      }
    });
  } catch (error) {
    console.error('Create Stripe intent error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create payment intent'
    });
  }
};

// @desc    Confirm Stripe payment
// @route   POST /api/payments/stripe/confirm
// @access  Private
exports.confirmStripePayment = async (req, res) => {
  try {
    const {
      paymentIntentId,
      campaignId,
      amount,
      isAnonymous,
      message
    } = req.body;

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        status: 'error',
        message: 'Payment has not been completed'
      });
    }

    // Check if donation already exists for this payment intent
    const existingDonation = await Donation.findOne({
      'paymentDetails.paymentId': paymentIntentId
    });

    if (existingDonation) {
      return res.status(400).json({
        status: 'error',
        message: 'Donation already recorded for this payment'
      });
    }

    // Create donation
    const donation = await Donation.create({
      donor: req.user.id,
      campaign: campaignId,
      amount: amount,
      currency: paymentIntent.currency.toUpperCase(),
      paymentMethod: 'stripe',
      paymentDetails: {
        transactionId: paymentIntent.id,
        paymentId: paymentIntent.id,
        orderId: paymentIntent.id,
        gateway: 'stripe',
        gatewayResponse: paymentIntent
      },
      status: 'completed',
      isAnonymous: isAnonymous || false,
      message: message || '',
      donorDetails: {
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone
      }
    });

    // Calculate fees
    donation.calculateFees();
    await donation.save();

    // Update campaign
    const campaign = await Campaign.findById(campaignId);
    campaign.currentAmount += amount;
    campaign.analytics.donations += 1;
    campaign.lastDonationDate = new Date();

    const totalDonations = await Donation.countDocuments({
      campaign: campaignId,
      status: 'completed'
    });
    campaign.analytics.avgDonationAmount = Math.round(campaign.currentAmount / totalDonations);

    await campaign.save();

    res.status(200).json({
      status: 'success',
      message: 'Payment confirmed and donation recorded successfully',
      data: {
        donationId: donation._id,
        receiptNumber: donation.receipt.receiptNumber
      }
    });
  } catch (error) {
    console.error('Confirm Stripe payment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to confirm payment'
    });
  }
};

// @desc    Process UPI payment
// @route   POST /api/payments/upi/process
// @access  Private
exports.processUPIPayment = async (req, res) => {
  try {
    const { upiId, amount, campaignId, isAnonymous, message } = req.body;

    if (!upiId || !amount || !campaignId) {
      return res.status(400).json({
        status: 'error',
        message: 'UPI ID, amount, and campaign ID are required'
      });
    }

    // Validate campaign
    const campaign = await Campaign.findById(campaignId);
    if (!campaign || campaign.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: 'Campaign is not available for donations'
      });
    }

    // In production, integrate with UPI payment gateway
    // For now, we'll create a pending donation
    const donation = await Donation.create({
      donor: req.user.id,
      campaign: campaignId,
      amount: amount,
      currency: 'INR',
      paymentMethod: 'upi',
      paymentDetails: {
        transactionId: `UPI${Date.now()}`,
        gateway: 'upi',
        gatewayResponse: { upiId: upiId }
      },
      status: 'pending', // Will be updated to completed after verification
      isAnonymous: isAnonymous || false,
      message: message || '',
      donorDetails: {
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'UPI payment initiated. Please complete the payment on your UPI app.',
      data: {
        donationId: donation._id,
        upiId: process.env.ORGANIZATION_UPI_ID || 'carefoundation@upi',
        amount: amount,
        transactionId: donation.paymentDetails.transactionId
      }
    });
  } catch (error) {
    console.error('Process UPI payment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process UPI payment'
    });
  }
};

// @desc    Get payment methods
// @route   GET /api/payments/methods
// @access  Public
exports.getPaymentMethods = async (req, res) => {
  try {
    const paymentMethods = [
      {
        id: 'razorpay',
        name: 'Credit/Debit Card, Net Banking, Wallets',
        provider: 'Razorpay',
        enabled: !!process.env.RAZORPAY_KEY_ID,
        supported: ['card', 'netbanking', 'wallet', 'upi']
      },
      {
        id: 'stripe',
        name: 'Credit/Debit Card (International)',
        provider: 'Stripe',
        enabled: !!process.env.STRIPE_SECRET_KEY,
        supported: ['card']
      },
      {
        id: 'upi',
        name: 'UPI',
        provider: 'Direct UPI',
        enabled: true,
        supported: ['upi']
      }
    ];

    res.status(200).json({
      status: 'success',
      data: paymentMethods.filter(method => method.enabled)
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch payment methods'
    });
  }
};

// @desc    Get payment status
// @route   GET /api/payments/status/:transactionId
// @access  Private
exports.getPaymentStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const donation = await Donation.findOne({
      'paymentDetails.transactionId': transactionId
    }).populate('campaign', 'title');

    if (!donation) {
      return res.status(404).json({
        status: 'error',
        message: 'Payment transaction not found'
      });
    }

    // Check if user has permission
    if (donation.donor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to view this transaction'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        transactionId: donation.paymentDetails.transactionId,
        amount: donation.amount,
        currency: donation.currency,
        paymentMethod: donation.paymentMethod,
        paymentStatus: donation.status,
        campaign: donation.campaign.title,
        date: donation.createdAt,
        receiptNumber: donation.receipt?.receiptNumber
      }
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch payment status'
    });
  }
};

// @desc    Razorpay webhook
// @route   POST /api/payments/razorpay/webhook
// @access  Public (with signature verification)
exports.razorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid signature'
      });
    }

    const event = req.body.event;
    const payload = req.body.payload.payment.entity;

    // Handle different events
    if (event === 'payment.captured') {
      // Payment successful - handled in verify endpoint
      console.log('Payment captured:', payload.id);
    } else if (event === 'payment.failed') {
      // Update donation status to failed
      await Donation.updateOne(
        { 'paymentDetails.paymentId': payload.id },
        { status: 'failed' }
      );
    }

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Razorpay webhook error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Webhook processing failed'
    });
  }
};

// @desc    Stripe webhook
// @route   POST /api/payments/stripe/webhook
// @access  Public (with signature verification)
exports.stripeWebhook = async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      return res.status(400).json({
        status: 'error',
        message: `Webhook signature verification failed: ${err.message}`
      });
    }

    // Handle the event
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      console.log('PaymentIntent succeeded:', paymentIntent.id);
      // Payment is handled in confirm endpoint
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      // Update donation status to failed
      await Donation.updateOne(
        { 'paymentDetails.paymentId': paymentIntent.id },
        { status: 'failed' }
      );
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Webhook processing failed'
    });
  }
};









