const mongoose = require('mongoose');
const Donation = require('../models/Donation');
const Campaign = require('../models/Campaign');
const { sendEmail } = require('../utils/emailService');

// @desc    Get all donations
// @route   GET /api/donations
// @access  Public (with pagination)
exports.getDonations = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      campaign,
      status,
      sortBy = '-createdAt'
    } = req.query;

    const query = {};
    if (campaign) query.campaign = campaign;
    if (status) query.status = status;

    const donations = await Donation.find(query)
      .populate('donor', 'name avatar email')
      .populate('campaign', 'title mainImage')
      .sort(sortBy)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Donation.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: donations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get donations error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch donations'
    });
  }
};

// @desc    Get single donation
// @route   GET /api/donations/:id
// @access  Private
exports.getDonation = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate('donor', 'name email phone avatar')
      .populate('campaign', 'title mainImage');

    if (!donation) {
      return res.status(404).json({
        status: 'error',
        message: 'Donation not found'
      });
    }

    // Check if user has permission
    if (donation.donor._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to view this donation'
      });
    }

    res.status(200).json({
      status: 'success',
      data: donation
    });
  } catch (error) {
    console.error('Get donation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch donation'
    });
  }
};

// @desc    Create new donation (Called after payment success)
// @route   POST /api/donations
// @access  Private
exports.createDonation = async (req, res) => {
  try {
    const {
      campaign: campaignId,
      campaignId: campaignIdAlt, // Support both 'campaign' and 'campaignId' field names
      amount,
      paymentMethod,
      paymentDetails,
      isAnonymous = false,
      message,
      donorDetails
    } = req.body;

    // Use campaignId from either field
    const finalCampaignId = campaignId || campaignIdAlt;

    // Validate campaignId is provided
    if (!finalCampaignId) {
      return res.status(400).json({
        status: 'error',
        message: 'Campaign ID is required',
        receivedData: req.body
      });
    }

    // Validate campaignId format (MongoDB ObjectId)
    if (!mongoose.Types.ObjectId.isValid(finalCampaignId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid campaign ID format',
        campaignId: finalCampaignId
      });
    }

    // Validate campaign exists
    const campaign = await Campaign.findById(finalCampaignId);
    if (!campaign) {
      console.error('Campaign not found:', finalCampaignId);
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found',
        campaignId: finalCampaignId
      });
    }

    // Check if campaign is active
    if (campaign.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: 'Campaign is not active for donations'
      });
    }

    // For test payments, create donation directly without payment verification
    const isTestPayment = paymentMethod === 'test' || process.env.NODE_ENV === 'development';
    
    // Get user ID (support both .id and ._id)
    const userId = req.user.id || req.user._id;
    if (!userId) {
      console.error('User ID not found in request:', req.user);
      return res.status(401).json({
        status: 'error',
        message: 'User ID not found. Please login again.'
      });
    }

    // Create donation
    const donation = await Donation.create({
      donor: userId,
      campaign: finalCampaignId,
      amount,
      paymentMethod: paymentMethod || 'test',
      paymentDetails: paymentDetails || {
        transactionId: `TEST${Date.now()}`,
        gateway: 'test',
        gatewayResponse: { test: true }
      },
      isAnonymous,
      message,
      donorDetails: donorDetails || {
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone
      },
      status: isTestPayment ? 'completed' : (paymentDetails ? 'completed' : 'pending') // Set to completed for test payments
    });

    // Calculate fees
    donation.calculateFees();
    await donation.save();

    // Update campaign amount
    campaign.currentAmount += amount;
    campaign.analytics.donations += 1;
    campaign.lastDonationDate = new Date();

    // Calculate average donation amount
    const totalDonations = await Donation.countDocuments({
      campaign: finalCampaignId,
      status: 'completed'
    });
    campaign.analytics.avgDonationAmount = Math.round(campaign.currentAmount / totalDonations);

    await campaign.save();

    // Track referral if donor was referred
    if (donation.status === 'completed') {
      try {
        const { updateReferralDonation } = require('./referralController');
        await updateReferralDonation(donation);
      } catch (refError) {
        console.error('Referral tracking error (non-critical):', refError);
        // Don't fail donation if referral tracking fails
      }
    }

    // Send thank you email (skip for test donations)
    if (!isTestPayment) {
      try {
        await sendEmail({
          email: req.user.email,
          subject: 'Thank You for Your Donation - Care Foundation',
          template: 'donationReceipt',
          data: {
            donorName: req.user.name,
            amount: amount,
            campaignTitle: campaign.title,
            receiptNumber: donation.receipt.receiptNumber,
            date: new Date().toLocaleDateString(),
            transactionId: donation.paymentDetails.transactionId
          }
        });

        donation.notifications.receiptSent = true;
        donation.notifications.thankYouSent = true;
        await donation.save();
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
      }
    }

    res.status(201).json({
      status: 'success',
      message: 'Donation created successfully',
      data: donation
    });
  } catch (error) {
    console.error('Create donation error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to create donation'
    });
  }
};

// @desc    Create test donation (without payment gateway)
// @route   POST /api/donations/test
// @access  Private
exports.createTestDonation = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      console.error('User not authenticated in createTestDonation');
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required. Please login first.'
      });
    }

    // Get user ID (support both .id and ._id)
    const userId = req.user.id || req.user._id;
    if (!userId) {
      console.error('User ID not found in request:', req.user);
      return res.status(401).json({
        status: 'error',
        message: 'User ID not found. Please login again.'
      });
    }

    const {
      campaign: campaignId,
      campaignId: campaignIdAlt, // Support both 'campaign' and 'campaignId' field names
      amount,
      isAnonymous = false,
      message,
      donorDetails
    } = req.body;

    console.log('Test donation request:', {
      userId: userId,
      campaignId: campaignId || campaignIdAlt,
      amount: amount,
      body: req.body
    });

    // Validate amount
    if (!amount || amount < 1) {
      return res.status(400).json({
        status: 'error',
        message: 'Donation amount is required and must be at least ₹1'
      });
    }

    // Use campaignId from either field
    const finalCampaignId = campaignId || campaignIdAlt;

    // Validate campaignId is provided
    if (!finalCampaignId) {
      return res.status(400).json({
        status: 'error',
        message: 'Campaign ID is required',
        receivedData: req.body
      });
    }

    // Validate campaignId format (MongoDB ObjectId)
    if (!mongoose.Types.ObjectId.isValid(finalCampaignId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid campaign ID format',
        campaignId: finalCampaignId
      });
    }

    // Validate campaign exists
    const campaign = await Campaign.findById(finalCampaignId);
    if (!campaign) {
      console.error('Campaign not found for test donation:', finalCampaignId);
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found',
        campaignId: finalCampaignId
      });
    }

    // Check if campaign is active
    if (campaign.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: 'Campaign is not active for donations'
      });
    }

    // Create test donation
    const donation = await Donation.create({
      donor: userId,
      campaign: finalCampaignId,
      amount: parseFloat(amount),
      currency: 'INR',
      paymentMethod: 'test',
      paymentDetails: {
        transactionId: `TEST${Date.now()}`,
        gateway: 'test',
        gatewayResponse: { test: true, mode: 'development' }
      },
      isAnonymous,
      message: message || 'Test donation',
      donorDetails: donorDetails || {
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone
      },
      status: 'completed' // Test donations are automatically completed
    });

    console.log('Test donation created:', donation._id);

    // Calculate fees (if method exists)
    try {
      if (typeof donation.calculateFees === 'function') {
        donation.calculateFees();
      }
    } catch (feeError) {
      console.error('Error calculating fees:', feeError);
      // Continue even if fee calculation fails
    }

    // Generate receipt number if needed
    try {
      if (!donation.receipt.receiptNumber) {
        donation.receipt.receiptNumber = `CF${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      }
      donation.receipt.generatedAt = new Date();
    } catch (receiptError) {
      console.error('Error generating receipt:', receiptError);
      // Continue even if receipt generation fails
    }

    await donation.save();

    // Update campaign amount
    campaign.currentAmount = (campaign.currentAmount || 0) + parseFloat(amount);
    campaign.analytics = campaign.analytics || {};
    campaign.analytics.donations = (campaign.analytics.donations || 0) + 1;
    campaign.lastDonationDate = new Date();

    // Calculate average donation amount
    const totalDonations = await Donation.countDocuments({
      campaign: finalCampaignId,
      status: 'completed'
    });
    
    if (totalDonations > 0) {
      campaign.analytics.avgDonationAmount = Math.round(campaign.currentAmount / totalDonations);
    } else {
      campaign.analytics.avgDonationAmount = parseFloat(amount);
    }

    await campaign.save();

    console.log('Campaign updated successfully. New amount:', campaign.currentAmount);

    res.status(201).json({
      status: 'success',
      message: 'Test donation created successfully',
      data: donation
    });
  } catch (error) {
    console.error('Create test donation error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    console.error('User:', req.user ? { id: req.user.id, name: req.user.name } : 'Not authenticated');
    
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to create test donation',
      ...(process.env.NODE_ENV === 'development' && { 
        error: error.toString(),
        stack: error.stack 
      })
    });
  }
};

// @desc    Get donation receipt
// @route   GET /api/donations/:id/receipt?format=pdf|json
// @access  Private
exports.getReceipt = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate('donor', 'name email phone address')
      .populate('campaign', 'title');

    if (!donation) {
      return res.status(404).json({
        status: 'error',
        message: 'Donation not found'
      });
    }

    // Check permission
    if (donation.donor._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to view this receipt'
      });
    }

    const format = req.query.format || 'json';

    if (format === 'pdf') {
      // TODO: Generate PDF receipt
      return res.status(501).json({
        status: 'error',
        message: 'PDF generation not yet implemented'
      });
    }

    // Return JSON receipt
    const receipt = {
      receiptNumber: donation.receipt.receiptNumber,
      date: donation.createdAt,
      donor: {
        name: donation.isAnonymous ? 'Anonymous Donor' : (donation.donorDetails.name || donation.donor.name),
        email: donation.isAnonymous ? '' : (donation.donorDetails.email || donation.donor.email),
        phone: donation.isAnonymous ? '' : (donation.donorDetails.phone || donation.donor.phone)
      },
      campaign: donation.campaign.title,
      amount: donation.amount,
      currency: donation.currency,
      paymentMethod: donation.paymentMethod,
      transactionId: donation.paymentDetails.transactionId,
      beneficiary: donation.beneficiary ? {
        name: donation.beneficiary.name,
        category: donation.beneficiary.category
      } : donation.purpose || 'General Donation',
      purpose: donation.purpose || 'General Support',
      taxBenefit: donation.taxBenefit
    };

    res.status(200).json({
      status: 'success',
      data: receipt
    });
  } catch (error) {
    console.error('Get receipt error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch receipt'
    });
  }
};

// @desc    Request donation refund
// @route   POST /api/donations/:id/refund
// @access  Private
exports.requestRefund = async (req, res) => {
  try {
    const { reason } = req.body;
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({
        status: 'error',
        message: 'Donation not found'
      });
    }

    // Check permission
    if (donation.donor.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only request refunds for your own donations'
      });
    }

    // Check if already refunded
    if (donation.status === 'refunded') {
      return res.status(400).json({
        status: 'error',
        message: 'Donation has already been refunded'
      });
    }

    // Update donation
    donation.refund = {
      requestedAt: new Date(),
      amount: donation.amount,
      reason: reason || 'Refund requested by donor',
      status: 'requested'
    };
    donation.status = 'refunded';
    await donation.save();

    res.status(200).json({
      status: 'success',
      message: 'Refund request submitted successfully',
      data: donation
    });
  } catch (error) {
    console.error('Request refund error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to request refund'
    });
  }
};

// @desc    Get donation statistics
// @route   GET /api/donations/stats/overview
// @access  Public
exports.getDonationStats = async (req, res) => {
  try {
    const stats = await Donation.aggregate([
      {
        $match: { status: 'completed' }
      },
      {
        $group: {
          _id: null,
          totalRaised: { $sum: '$amount' },
          totalDonations: { $sum: 1 },
          avgDonation: { $avg: '$amount' }
        }
      }
    ]);

    const result = stats[0] || {
      totalRaised: 0,
      totalDonations: 0,
      avgDonation: 0
    };

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Get donation stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch donation statistics'
    });
  }
};

// @desc    Get user's donations
// @route   GET /api/donations/my-donations
// @access  Private
exports.getMyDonations = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      sortBy = '-createdAt'
    } = req.query;

    const query = { donor: req.user.id };
    if (status) query.status = status;

    const donations = await Donation.find(query)
      .populate('campaign', 'title mainImage currentAmount goalAmount')
      .sort(sortBy)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Donation.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: donations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get my donations error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch donations'
    });
  }
};
