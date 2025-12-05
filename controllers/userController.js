const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Donation = require('../models/Donation');
const Coupon = require('../models/Coupon');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Get user statistics
    const campaigns = await Campaign.countDocuments({ fundraiser: user._id });
    const donations = await Donation.countDocuments({ donor: user._id, status: 'completed' });
    
    const donationStats = await Donation.aggregate([
      { $match: { donor: user._id, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalDonated: { $sum: '$amount' }
        }
      }
    ]);

    const userData = user.toObject();
    userData.statistics = {
      campaignsCreated: campaigns,
      totalDonations: donations,
      totalDonated: donationStats[0]?.totalDonated || 0
    };

    res.status(200).json({
      status: 'success',
      data: userData
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch profile'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const {
      name,
      phone,
      address,
      socialLinks,
      preferences,
      avatar
    } = req.body;

    const fieldsToUpdate = {};
    if (name) fieldsToUpdate.name = name;
    if (phone) fieldsToUpdate.phone = phone;
    if (address) fieldsToUpdate.address = address;
    if (socialLinks) fieldsToUpdate.socialLinks = socialLinks;
    if (preferences) fieldsToUpdate.preferences = preferences;
    if (avatar) fieldsToUpdate.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      fieldsToUpdate,
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to update profile'
    });
  }
};

// @desc    Get user campaigns
// @route   GET /api/users/campaigns
// @access  Private
exports.getUserCampaigns = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { fundraiser: req.user.id };
    if (status) query.status = status;

    const campaigns = await Campaign.find(query)
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Campaign.countDocuments(query);

    // Add progress percentage to each campaign
    const campaignsWithProgress = campaigns.map(campaign => ({
      ...campaign,
      progressPercentage: Math.round((campaign.currentAmount / campaign.goalAmount) * 100),
      daysRemaining: Math.max(0, Math.ceil((new Date(campaign.timeline.endDate) - new Date()) / (1000 * 60 * 60 * 24)))
    }));

    res.status(200).json({
      status: 'success',
      results: campaigns.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      data: campaignsWithProgress
    });
  } catch (error) {
    console.error('Get user campaigns error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch campaigns'
    });
  }
};

// @desc    Get user donations
// @route   GET /api/users/donations
// @access  Private
exports.getUserDonations = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const donations = await Donation.find({ 
      donor: req.user.id,
      status: 'completed'
    })
      .populate('campaign', 'title images goalAmount currentAmount')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Donation.countDocuments({ 
      donor: req.user.id,
      status: 'completed'
    });

    // Get total donated amount
    const stats = await Donation.aggregate([
      { $match: { donor: req.user._id, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalDonated: { $sum: '$amount' },
          donationCount: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      results: donations.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      summary: stats[0] || { totalDonated: 0, donationCount: 0 },
      data: donations
    });
  } catch (error) {
    console.error('Get user donations error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch donations'
    });
  }
};

// @desc    Get user coupons
// @route   GET /api/users/coupons
// @access  Private
exports.getUserCoupons = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { issuer: req.user.id };
    if (status) query.status = status;

    const coupons = await Coupon.find(query)
      .populate('campaign', 'title')
      .populate('partner', 'name businessType')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Coupon.countDocuments(query);

    res.status(200).json({
      status: 'success',
      results: coupons.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      data: coupons
    });
  } catch (error) {
    console.error('Get user coupons error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch coupons'
    });
  }
};

// @desc    Submit KYC documents
// @route   POST /api/users/kyc
// @route   POST /api/users/kyc/upload
// @access  Private
exports.submitKYC = async (req, res) => {
  try {
    const { documentType, documentNumber, documentFile, type, number, file } = req.body;

    // Support both naming conventions
    const docType = documentType || type;
    const docNumber = documentNumber || number;
    const docFile = documentFile || file;

    if (!docType || !docNumber) {
      return res.status(400).json({
        status: 'error',
        message: 'Document type and number are required'
      });
    }

    const user = await User.findById(req.user.id);

    // Check if document type already exists
    const existingDoc = user.kyc.documents.find(doc => doc.type === docType);
    if (existingDoc) {
      return res.status(400).json({
        status: 'error',
        message: `${docType} document already submitted`
      });
    }

    // Add document
    user.kyc.documents.push({
      type: docType,
      number: docNumber,
      file: docFile || '',
      verified: false
    });

    // Check if KYC is completed (at least one document)
    if (user.kyc.documents.length > 0) {
      user.kyc.isCompleted = true;
    }

    await user.save();

    // Return full user object for frontend
    const updatedUser = await User.findById(req.user.id).select('-password');

    res.status(200).json({
      status: 'success',
      message: 'KYC document submitted successfully. It will be reviewed shortly.',
      data: updatedUser
    });
  } catch (error) {
    console.error('Submit KYC error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to submit KYC document'
    });
  }
};

// @desc    Get KYC status
// @route   GET /api/users/kyc/status
// @access  Private
exports.getKYCStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('kyc');

    res.status(200).json({
      status: 'success',
      data: {
        isCompleted: user.kyc.isCompleted,
        documents: user.kyc.documents.map(doc => ({
          type: doc.type,
          verified: doc.verified,
          submittedAt: doc._id.getTimestamp()
        })),
        allVerified: user.kyc.documents.every(doc => doc.verified)
      }
    });
  } catch (error) {
    console.error('Get KYC status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch KYC status'
    });
  }
};

// @desc    Update notification preferences
// @route   PUT /api/users/preferences/notifications
// @access  Private
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const { email, sms, push } = req.body;

    const user = await User.findById(req.user.id);

    if (email !== undefined) user.preferences.notifications.email = email;
    if (sms !== undefined) user.preferences.notifications.sms = sms;
    if (push !== undefined) user.preferences.notifications.push = push;

    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Notification preferences updated successfully',
      data: user.preferences.notifications
    });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update preferences'
    });
  }
};

// @desc    Update privacy preferences
// @route   PUT /api/users/preferences/privacy
// @access  Private
exports.updatePrivacyPreferences = async (req, res) => {
  try {
    const { showProfile, showDonations } = req.body;

    const user = await User.findById(req.user.id);

    if (showProfile !== undefined) user.preferences.privacy.showProfile = showProfile;
    if (showDonations !== undefined) user.preferences.privacy.showDonations = showDonations;

    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Privacy preferences updated successfully',
      data: user.preferences.privacy
    });
  } catch (error) {
    console.error('Update privacy preferences error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update preferences'
    });
  }
};

// @desc    Get user dashboard stats
// @route   GET /api/users/dashboard
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    // Get campaign stats (if fundraiser)
    let campaignStats = null;
    if (user.role === 'fundraiser' || user.role === 'admin') {
      const campaigns = await Campaign.find({ fundraiser: user._id });
      const totalRaised = campaigns.reduce((sum, c) => sum + c.currentAmount, 0);
      const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

      campaignStats = {
        totalCampaigns: campaigns.length,
        activeCampaigns,
        totalRaised,
        pendingCampaigns: campaigns.filter(c => c.status === 'pending').length
      };
    }

    // Get donation stats
    const donationStats = await Donation.aggregate([
      { $match: { donor: user._id, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalDonated: { $sum: '$amount' },
          donationCount: { $sum: 1 }
        }
      }
    ]);

    // Get coupon stats
    const couponStats = await Coupon.aggregate([
      { $match: { issuer: user._id } },
      {
        $group: {
          _id: null,
          totalCoupons: { $sum: 1 },
          activeCoupons: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          totalRedemptions: { $sum: '$usage.usedCount' }
        }
      }
    ]);

    // Get recent activities
    const recentDonations = await Donation.find({
      donor: user._id,
      status: 'completed'
    })
      .populate('campaign', 'title')
      .sort('-createdAt')
      .limit(5)
      .lean();

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          kycCompleted: user.kyc.isCompleted
        },
        campaigns: campaignStats,
        donations: donationStats[0] || { totalDonated: 0, donationCount: 0 },
        coupons: couponStats[0] || { totalCoupons: 0, activeCoupons: 0, totalRedemptions: 0 },
        recentActivity: recentDonations
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch dashboard statistics'
    });
  }
};

// @desc    Delete user account
// @route   DELETE /api/users/account
// @access  Private
exports.deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        status: 'error',
        message: 'Password is required to delete account'
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid password'
      });
    }

    // Check if user has active campaigns
    const activeCampaigns = await Campaign.countDocuments({
      fundraiser: user._id,
      status: 'active'
    });

    if (activeCampaigns > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete account with active campaigns. Please complete or cancel them first.'
      });
    }

    // Deactivate instead of delete (for data integrity)
    user.isActive = false;
    user.email = `deleted_${user._id}@deleted.com`; // Anonymize email
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete account'
    });
  }
};

// @desc    Generate referral link
// @route   POST /api/users/referrals/generate
// @access  Private
exports.generateReferralLink = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Generate unique referral code if not exists
    if (!user.referralCode) {
      const crypto = require('crypto');
      user.referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
      await user.save();
    }

    const referralLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?ref=${user.referralCode}`;

    res.status(200).json({
      status: 'success',
      data: {
        referralCode: user.referralCode,
        referralLink: referralLink
      }
    });
  } catch (error) {
    console.error('Generate referral link error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate referral link'
    });
  }
};

// @desc    Get user referrals
// @route   GET /api/users/referrals
// @access  Private
exports.getReferrals = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Get all users referred by this user
    const referrals = await User.find({
      referredBy: req.user.id
    }).select('name email createdAt');

    // Calculate referral stats
    const totalReferrals = referrals.length;
    const activeCampaignsFromReferrals = await Campaign.countDocuments({
      fundraiser: { $in: referrals.map(r => r._id) },
      status: 'active'
    });

    res.status(200).json({
      status: 'success',
      data: {
        referralCode: user.referralCode,
        totalReferrals,
        activeCampaignsFromReferrals,
        referrals
      }
    });
  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch referrals'
    });
  }
};

// @desc    Request withdrawal/payout
// @route   POST /api/users/withdrawals/request
// @access  Private
exports.requestWithdrawal = async (req, res) => {
  try {
    const { campaignId, amount, accountDetails } = req.body;

    if (!campaignId || !amount || !accountDetails) {
      return res.status(400).json({
        status: 'error',
        message: 'Campaign, amount, and account details are required'
      });
    }

    // Verify campaign ownership
    const campaign = await Campaign.findById(campaignId);
    if (!campaign || campaign.fundraiser.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized: You do not own this campaign'
      });
    }

    // Check if amount is available
    if (amount > campaign.currentAmount) {
      return res.status(400).json({
        status: 'error',
        message: 'Insufficient funds in campaign'
      });
    }

    // Create withdrawal request (you can create a Withdrawal model later)
    const Withdrawal = require('../models/Withdrawal');
    const withdrawal = await Withdrawal.create({
      user: req.user.id,
      campaign: campaignId,
      amount,
      accountDetails,
      status: 'pending'
    });

    res.status(201).json({
      status: 'success',
      message: 'Withdrawal request submitted successfully. It will be processed within 3-5 business days.',
      data: withdrawal
    });
  } catch (error) {
    console.error('Request withdrawal error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to request withdrawal'
    });
  }
};

// @desc    Get user withdrawals
// @route   GET /api/users/withdrawals
// @access  Private
exports.getWithdrawals = async (req, res) => {
  try {
    const Withdrawal = require('../models/Withdrawal');
    const withdrawals = await Withdrawal.find({ user: req.user.id })
      .populate('campaign', 'title currentAmount')
      .sort('-createdAt');

    // Calculate total withdrawn
    const totalWithdrawn = withdrawals
      .filter(w => w.status === 'completed')
      .reduce((sum, w) => sum + w.amount, 0);

    res.status(200).json({
      status: 'success',
      data: {
        withdrawals,
        totalWithdrawn,
        pendingWithdrawals: withdrawals.filter(w => w.status === 'pending').length
      }
    });
  } catch (error) {
    console.error('Get withdrawals error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch withdrawals'
    });
  }
};

// @desc    Download user donations report
// @route   GET /api/users/donations/report
// @access  Private
exports.downloadUserDonationsReport = async (req, res) => {
  try {
    const { format = 'excel', startDate, endDate } = req.query;

    // Build query for user's donations only
    let query = { 
      donor: req.user.id,
      status: 'completed' // Only completed donations
    };

    // Add date filters if provided
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Fetch user's donations with populated data
    const donations = await Donation.find(query)
      .populate('campaign', 'title')
      .populate('beneficiary', 'name category')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Generating ${format} report for user ${req.user.id}, found ${donations.length} donations`);

    if (format === 'excel') {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('My Donations');

      // Add title row
      worksheet.mergeCells('A1:I1');
      worksheet.getCell('A1').value = 'My Donations Report - Care Foundation Trust';
      worksheet.getCell('A1').font = { bold: true, size: 16 };
      worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 25;

      // Add user info row
      worksheet.mergeCells('A2:I2');
      worksheet.getCell('A2').value = `Generated for: ${req.user.name} (${req.user.email})`;
      worksheet.getCell('A2').font = { size: 12 };
      worksheet.getCell('A2').alignment = { horizontal: 'center' };
      worksheet.getRow(2).height = 20;

      // Add date row
      worksheet.mergeCells('A3:I3');
      worksheet.getCell('A3').value = `Generated on: ${new Date().toLocaleString()}`;
      worksheet.getCell('A3').font = { size: 10, italic: true };
      worksheet.getCell('A3').alignment = { horizontal: 'center' };
      worksheet.getRow(3).height = 18;

      // Headers row (row 4)
      worksheet.getRow(4).values = [
        'Date',
        'Campaign Title',
        'Amount (₹)',
        'Status',
        'Transaction ID',
        'Beneficiary',
        'Payment Method',
        'Purpose',
        'Receipt Number'
      ];

      // Style header row
      worksheet.getRow(4).font = { bold: true, size: 12 };
      worksheet.getRow(4).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4CAF50' } // Green background
      };
      worksheet.getRow(4).alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(4).height = 25;

      // Set column widths
      worksheet.columns = [
        { width: 18 }, // Date
        { width: 35 }, // Campaign Title
        { width: 15 }, // Amount
        { width: 12 }, // Status
        { width: 25 }, // Transaction ID
        { width: 25 }, // Beneficiary
        { width: 18 }, // Payment Method
        { width: 25 }, // Purpose
        { width: 20 }  // Receipt Number
      ];

      // Add data rows
      if (donations.length > 0) {
        donations.forEach((donation, index) => {
          const row = worksheet.addRow([
            new Date(donation.createdAt).toLocaleDateString('en-IN'),
            donation.campaign?.title || 'General Donation',
            donation.amount || 0,
            donation.status || 'completed',
            donation.paymentDetails?.transactionId || donation.transactionId || 'N/A',
            donation.beneficiary?.name || donation.purpose || 'General Support',
            donation.paymentMethod || 'N/A',
            donation.purpose || 'General Support',
            donation.receipt?.receiptNumber || 'N/A'
          ]);

          // Style data rows
          row.alignment = { vertical: 'middle' };
          row.getCell(3).numFmt = '#,##0.00'; // Format amount as number
          if (index % 2 === 0) {
            row.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF5F5F5' } // Light gray for alternate rows
            };
          }
        });

        // Add summary row
        const totalRowNumber = worksheet.rowCount + 1;
        const totalRow = worksheet.addRow([]);
        worksheet.mergeCells(`A${totalRowNumber}:B${totalRowNumber}`);
        worksheet.getCell(`A${totalRowNumber}`).value = 'TOTAL:';
        worksheet.getCell(`A${totalRowNumber}`).font = { bold: true, size: 12 };
        worksheet.getCell(`C${totalRowNumber}`).value = {
          formula: `SUM(C5:C${totalRowNumber - 1})`,
          result: donations.reduce((sum, d) => sum + (d.amount || 0), 0)
        };
        worksheet.getCell(`C${totalRowNumber}`).numFmt = '#,##0.00';
        worksheet.getCell(`C${totalRowNumber}`).font = { bold: true };
        worksheet.getRow(totalRowNumber).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE8F5E9' } // Light green
        };
      } else {
        // No donations message
        worksheet.mergeCells(`A5:I5`);
        worksheet.getCell('A5').value = 'No donations found';
        worksheet.getCell('A5').alignment = { horizontal: 'center' };
        worksheet.getCell('A5').font = { italic: true };
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=my-donations-report-${Date.now()}.xlsx`);
      
      await workbook.xlsx.write(res);
      res.end();
    } else if (format === 'pdf') {
      // For PDF, return JSON data (PDF generation can be added later with pdfkit or similar)
      res.status(200).json({
        status: 'success',
        message: 'PDF format not yet implemented. Please use Excel format.',
        data: donations,
        count: donations.length,
        summary: {
          totalDonated: donations.reduce((sum, d) => sum + (d.amount || 0), 0),
          totalDonations: donations.length
        }
      });
    } else {
      // Default: return JSON
      res.status(200).json({
        status: 'success',
        data: donations,
        count: donations.length,
        summary: {
          totalDonated: donations.reduce((sum, d) => sum + (d.amount || 0), 0),
          totalDonations: donations.length
        }
      });
    }
  } catch (error) {
    console.error('Download user donations report error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate report: ' + error.message
    });
  }
};




