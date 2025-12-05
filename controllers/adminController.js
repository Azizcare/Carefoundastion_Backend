const Campaign = require('../models/Campaign');
const User = require('../models/User');
const Donation = require('../models/Donation');
const Coupon = require('../models/Coupon');
const Partner = require('../models/Partner');
const Beneficiary = require('../models/Beneficiary');
const FormSubmission = require('../models/FormSubmission');
const { sendEmail } = require('../utils/emailService');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
  try {
    // Get counts
    const totalUsers = await User.countDocuments();
    const totalCampaigns = await Campaign.countDocuments();
    const activeCampaigns = await Campaign.countDocuments({ status: 'active' });
    const completedCampaigns = await Campaign.countDocuments({ status: 'completed' });
    const pendingCampaigns = await Campaign.countDocuments({ status: 'pending' });
    
    const totalDonations = await Donation.countDocuments({ status: 'completed' });
    const totalCoupons = await Coupon.countDocuments();
    const activeCoupons = await Coupon.countDocuments({ status: 'active' });
    
    const totalPartners = await Partner.countDocuments();
    
    // Count food partners - just check status approved (isActive defaults to true in model)
    // First get all approved food partners
    const allFoodPartners = await Partner.find({ category: 'food', status: 'approved' }).select('name isActive').lean();
    const foodPartners = allFoodPartners.filter(p => p.isActive !== false).length; // Count only if isActive is not explicitly false
    
    // Count health/medical partners - just check status approved
    const allHealthPartners = await Partner.find({ category: 'medical', status: 'approved' }).select('name isActive').lean();
    const healthPartners = allHealthPartners.filter(p => p.isActive !== false).length; // Count only if isActive is not explicitly false
    
    const pendingPartners = await Partner.countDocuments({ status: 'pending' });
    
    // Debug logs to help troubleshoot
    console.log('=== Dashboard Stats Debug ===');
    console.log('Total Partners:', totalPartners);
    console.log('Food Partners (approved):', foodPartners);
    console.log('Health Partners (approved):', healthPartners);
    console.log('All Food Partners Details:', allFoodPartners);
    console.log('All Health Partners Details:', allHealthPartners);
    console.log('===========================');
    
    // Count volunteers - users with role 'volunteer'
    const volunteers = await User.countDocuments({ role: 'volunteer' });
    
    // Debug log for volunteers
    console.log('=== Volunteers Count Debug ===');
    console.log('Volunteers Count:', volunteers);
    const volunteerUsers = await User.find({ role: 'volunteer' }).select('name email role').lean();
    console.log('Volunteer Users:', volunteerUsers);
    console.log('=============================');
    
    // Get financial stats
    const financialStats = await Donation.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          avgDonation: { $avg: '$amount' },
          totalFees: { $sum: '$fees.totalFees' }
        }
      }
    ]);

    const financial = financialStats[0] || {
      totalAmount: 0,
      avgDonation: 0,
      totalFees: 0
    };

    // Get monthly donation trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await Donation.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Get recent activities
    const recentCampaigns = await Campaign.find()
      .sort('-createdAt')
      .limit(5)
      .populate('fundraiser', 'name email')
      .lean();

    const recentDonations = await Donation.find({ status: 'completed' })
      .sort('-createdAt')
      .limit(5)
      .populate('donor', 'name')
      .populate('campaign', 'title')
      .lean();

    // Get top campaigns
    const topCampaigns = await Campaign.find({ status: 'active' })
      .sort('-currentAmount')
      .limit(5)
      .select('title currentAmount goalAmount')
      .lean();

    res.status(200).json({
      status: 'success',
      data: {
        overview: {
          totalUsers,
          totalCampaigns,
          activeCampaigns,
          completedCampaigns,
          pendingCampaigns,
          totalDonations,
          totalCoupons,
          activeCoupons,
          totalPartners,
          foodPartners,
          healthPartners,
          pendingPartners,
          volunteers
        },
        financial: {
          totalRaised: financial.totalAmount,
          avgDonation: Math.round(financial.avgDonation),
          totalFees: financial.totalFees,
          netRevenue: financial.totalAmount - financial.totalFees
        },
        trends: {
          monthlyDonations: monthlyTrend
        },
        recent: {
          campaigns: recentCampaigns,
          donations: recentDonations
        },
        topCampaigns
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

// @desc    Get all campaigns for admin review
// @route   GET /api/admin/campaigns
// @access  Private/Admin
exports.getAdminCampaigns = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      sortBy = '-createdAt'
    } = req.query;

    const query = {};
    // CRITICAL: Always filter by status if provided
    // If no status provided, default to showing only active campaigns for admin overview
    // But this should rarely happen as frontend should always specify status
    if (status) {
      query.status = status;
    } else {
      // Default: show only active campaigns if no status filter
      // This prevents showing pending campaigns in wrong sections
      query.status = 'active';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const campaigns = await Campaign.find(query)
      .populate('fundraiser', 'name email phone isVerified kyc')
      .sort(sortBy)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Campaign.countDocuments(query);

    res.status(200).json({
      status: 'success',
      results: campaigns.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      data: campaigns
    });
  } catch (error) {
    console.error('Get admin campaigns error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch campaigns'
    });
  }
};

// @desc    Approve campaign
// @route   PUT /api/admin/campaigns/:id/approve
// @access  Private/Admin
exports.approveCampaign = async (req, res) => {
  try {
    const { verificationNotes } = req.body;

    const campaign = await Campaign.findById(req.params.id)
      .populate('fundraiser', 'name email');

    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found'
      });
    }

    // Allow approval of both 'pending' and 'draft' campaigns
    // (Some old campaigns might have 'draft' status)
    if (campaign.status !== 'pending' && campaign.status !== 'draft') {
      return res.status(400).json({
        status: 'error',
        message: `Only pending or draft campaigns can be approved. Current status: ${campaign.status}`
      });
    }

    // Update campaign status
    campaign.status = 'active';
    campaign.isActive = true; // Set to active when approved
    campaign.verification.isVerified = true;
    campaign.verification.verifiedBy = req.user.id;
    campaign.verification.verifiedAt = new Date();
    campaign.verification.verificationNotes = verificationNotes || '';

    await campaign.save();

    // Send approval email to fundraiser
    try {
      await sendEmail({
        email: campaign.fundraiser.email,
        subject: 'Campaign Approved - Care Foundation',
        template: 'campaignUpdate',
        data: {
          donorName: campaign.fundraiser.name,
          campaignTitle: campaign.title,
          updateTitle: 'Your Campaign is Now Live!',
          updateDescription: `Congratulations! Your campaign "${campaign.title}" has been approved and is now live on Care Foundation. You can start receiving donations.`,
          campaignUrl: `${process.env.FRONTEND_URL}/campaigns/${campaign._id}`
        }
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    res.status(200).json({
      status: 'success',
      message: 'Campaign approved successfully',
      data: campaign
    });
  } catch (error) {
    console.error('Approve campaign error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to approve campaign'
    });
  }
};

// @desc    Reject campaign
// @route   PUT /api/admin/campaigns/:id/reject
// @access  Private/Admin
exports.rejectCampaign = async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        status: 'error',
        message: 'Rejection reason is required'
      });
    }

    const campaign = await Campaign.findById(req.params.id)
      .populate('fundraiser', 'name email');

    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found'
      });
    }

    if (campaign.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: 'Only pending campaigns can be rejected'
      });
    }

    // Update campaign status
    campaign.status = 'rejected';
    campaign.rejectionReason = rejectionReason;

    await campaign.save();

    // Send rejection email to fundraiser
    try {
      await sendEmail({
        email: campaign.fundraiser.email,
        subject: 'Campaign Review Update - Care Foundation',
        template: 'campaignUpdate',
        data: {
          donorName: campaign.fundraiser.name,
          campaignTitle: campaign.title,
          updateTitle: 'Campaign Requires Modifications',
          updateDescription: `Your campaign "${campaign.title}" needs some modifications before it can be approved. Reason: ${rejectionReason}. Please update your campaign and resubmit for review.`,
          campaignUrl: `${process.env.FRONTEND_URL}/campaigns/${campaign._id}/edit`
        }
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    res.status(200).json({
      status: 'success',
      message: 'Campaign rejected',
      data: campaign
    });
  } catch (error) {
    console.error('Reject campaign error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reject campaign'
    });
  }
};

// @desc    Mark campaign as completed
// @route   PUT /api/admin/campaigns/:id/complete
// @access  Private/Admin
exports.completeCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('fundraiser', 'name email');

    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found'
      });
    }

    // Only active campaigns can be marked as completed
    if (campaign.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: `Only active campaigns can be marked as completed. Current status: ${campaign.status}`
      });
    }

    // Update campaign status to completed
    campaign.status = 'completed';
    campaign.isActive = false; // Set to inactive when completed

    await campaign.save();

    // Send completion email to fundraiser
    try {
      await sendEmail({
        email: campaign.fundraiser.email,
        subject: 'Campaign Completed - Care Foundation',
        template: 'campaignUpdate',
        data: {
          donorName: campaign.fundraiser.name,
          campaignTitle: campaign.title,
          updateTitle: 'Campaign Completed!',
          updateDescription: `Your campaign "${campaign.title}" has been marked as completed. The total amount raised is ₹${campaign.currentAmount?.toLocaleString() || 0}.`,
          campaignUrl: `${process.env.FRONTEND_URL}/campaigns/${campaign._id}`
        }
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    res.status(200).json({
      status: 'success',
      message: 'Campaign marked as completed successfully',
      data: campaign
    });
  } catch (error) {
    console.error('Complete campaign error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to mark campaign as completed'
    });
  }
};

// @desc    Get single user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -otp -otpExpiry -resetPasswordToken -resetPasswordExpire -verificationToken -verificationExpire')
      .lean();

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Get additional stats
    const Campaign = require('../models/Campaign');
    const Donation = require('../models/Donation');
    
    const campaignsCount = await Campaign.countDocuments({ fundraiser: user._id });
    const donationsCount = await Donation.countDocuments({ donor: user._id, status: 'completed' });
    
    const donationStats = await Donation.aggregate([
      { $match: { donor: user._id, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalDonated: { $sum: '$amount' }
        }
      }
    ]);

    user.statistics = {
      campaignsCreated: campaignsCount,
      totalDonations: donationsCount,
      totalDonated: donationStats[0]?.totalDonated || 0
    };

    res.status(200).json({
      status: 'success',
      data: user
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user'
    });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      isVerified,
      isActive,
      sortBy = '-createdAt'
    } = req.query;

    const query = {};
    if (role) query.role = role;
    if (isVerified !== undefined) query.isVerified = isVerified === 'true';
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(query)
      .select('-password')
      .sort(sortBy)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await User.countDocuments(query);

    res.status(200).json({
      status: 'success',
      results: users.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch users'
    });
  }
};

// @desc    Update user status
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
exports.updateUserStatus = async (req, res) => {
  try {
    const { isActive, isVerified, name, email, phone } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Update status fields
    if (isActive !== undefined) user.isActive = isActive;
    if (isVerified !== undefined) user.isVerified = isVerified;
    
    // Update user details if provided
    if (name) user.name = name;
    if (email) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Email already in use'
        });
      }
      user.email = email;
    }
    if (phone) {
      // Validate phone number format
      if (!/^\d{10}$/.test(phone)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid phone number. Must be 10 digits'
        });
      }
      user.phone = phone;
    }

    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'User updated successfully',
      data: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to update user'
    });
  }
};

// @desc    Assign role to user
// @route   PUT /api/admin/users/:id/assign-role
// @access  Private/Admin
exports.assignRole = async (req, res) => {
  try {
    const { role } = req.body;

    const validRoles = ['donor', 'fundraiser', 'admin', 'partner', 'volunteer', 'vendor', 'staff'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        status: 'error',
        message: 'Valid role is required. Valid roles: ' + validRoles.join(', ')
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    user.role = role;
    // Set default permissions for the role
    user.setDefaultPermissions();
    await user.save();

    res.status(200).json({
      status: 'success',
      message: `Role '${role}' assigned successfully`,
      data: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Assign role error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to assign role'
    });
  }
};

// @desc    Assign permissions to user
// @route   PUT /api/admin/users/:id/assign-permissions
// @access  Private/Admin
exports.assignPermissions = async (req, res) => {
  try {
    const { permissions } = req.body;

    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({
        status: 'error',
        message: 'Permissions object is required'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Update permissions
    if (permissions.campaigns) user.permissions.campaigns = { ...user.permissions.campaigns, ...permissions.campaigns };
    if (permissions.donations) user.permissions.donations = { ...user.permissions.donations, ...permissions.donations };
    if (permissions.coupons) user.permissions.coupons = { ...user.permissions.coupons, ...permissions.coupons };
    if (permissions.users) user.permissions.users = { ...user.permissions.users, ...permissions.users };
    if (permissions.volunteers) user.permissions.volunteers = { ...user.permissions.volunteers, ...permissions.volunteers };
    if (permissions.forms) user.permissions.forms = { ...user.permissions.forms, ...permissions.forms };
    if (permissions.reports) user.permissions.reports = { ...user.permissions.reports, ...permissions.reports };
    if (permissions.wallets) user.permissions.wallets = { ...user.permissions.wallets, ...permissions.wallets };

    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Permissions assigned successfully',
      data: {
        userId: user._id,
        role: user.role,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error('Assign permissions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to assign permissions'
    });
  }
};

// @desc    Get user permissions
// @route   GET /api/admin/users/:id/permissions
// @access  Private/Admin
exports.getUserPermissions = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        userId: user._id,
        name: user.name,
        role: user.role,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error('Get user permissions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user permissions'
    });
  }
};

// @desc    Get all beneficiaries
// @route   GET /api/admin/beneficiaries
// @access  Private/Admin
exports.getBeneficiaries = async (req, res) => {
  try {
    const { status, category, search } = req.query;

    let query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const beneficiaries = await Beneficiary.find(query)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      count: beneficiaries.length,
      data: beneficiaries
    });
  } catch (error) {
    console.error('Get beneficiaries error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch beneficiaries'
    });
  }
};

// @desc    Get all form submissions
// @route   GET /api/admin/form-submissions
// @access  Private/Admin
exports.getFormSubmissions = async (req, res) => {
  try {
    const { formType, status } = req.query;

    let query = {};
    if (formType) query.formType = formType;
    if (status) query.status = status;

    const submissions = await FormSubmission.find(query)
      .populate('submittedBy', 'name email phone')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      count: submissions.length,
      data: submissions
    });
  } catch (error) {
    console.error('Get form submissions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch form submissions'
    });
  }
};

// @desc    Get all partners
// @route   GET /api/admin/partners
// @access  Private/Admin
exports.getPartners = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      sortBy = '-createdAt'
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const partners = await Partner.find(query)
      .sort(sortBy)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Partner.countDocuments(query);

    res.status(200).json({
      status: 'success',
      results: partners.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      data: partners
    });
  } catch (error) {
    console.error('Get partners error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch partners'
    });
  }
};

// @desc    Approve partner
// @route   PUT /api/admin/partners/:id/approve
// @access  Private/Admin
exports.approvePartner = async (req, res) => {
  try {
    const { verificationNotes } = req.body;

    const partner = await Partner.findById(req.params.id);

    if (!partner) {
      return res.status(404).json({
        status: 'error',
        message: 'Partner not found'
      });
    }

    if (partner.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: 'Only pending partners can be approved'
      });
    }

    partner.status = 'approved';
    partner.isActive = true;
    partner.verification.isVerified = true;
    partner.verification.verifiedBy = req.user.id;
    partner.verification.verifiedAt = new Date();
    partner.verification.verificationNotes = verificationNotes || '';

    await partner.save();

    // Create partner user account if not exists
    const existingUser = await User.findOne({ email: partner.email });
    if (!existingUser) {
      // Send welcome email with account creation instructions
      console.log('Send partner welcome email to:', partner.email);
    }

    res.status(200).json({
      status: 'success',
      message: 'Partner approved successfully',
      data: partner
    });
  } catch (error) {
    console.error('Approve partner error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to approve partner'
    });
  }
};

// @desc    Reject partner
// @route   PUT /api/admin/partners/:id/reject
// @access  Private/Admin
exports.rejectPartner = async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    const partner = await Partner.findById(req.params.id);

    if (!partner) {
      return res.status(404).json({
        status: 'error',
        message: 'Partner not found'
      });
    }

    if (partner.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: 'Only pending partners can be rejected'
      });
    }

    partner.status = 'rejected';
    partner.isActive = false;
    partner.rejectionReason = rejectionReason || 'Partner request rejected';

    await partner.save();

    // Send rejection email to partner
    try {
      await sendEmail({
        email: partner.email,
        subject: 'Partner Request Update - Care Foundation',
        template: 'partnerRejection',
        data: {
          partnerName: partner.name || partner.contactPerson?.name,
          rejectionReason: rejectionReason || 'Your partner request has been rejected. Please contact support for more information.',
          contactEmail: process.env.SUPPORT_EMAIL || 'support@carefoundation.org'
        }
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    res.status(200).json({
      status: 'success',
      message: 'Partner rejected successfully',
      data: partner
    });
  } catch (error) {
    console.error('Reject partner error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reject partner'
    });
  }
};

// @desc    Update partner (generic - handles all fields)
// @route   PUT /api/admin/partners/:id
// @access  Private/Admin
exports.updatePartner = async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Remove fields that shouldn't be directly updated
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    
    // Handle metadata update separately to merge with existing metadata
    if (updateData.metadata) {
      const existingPartner = await Partner.findById(req.params.id);
      if (existingPartner) {
        updateData.metadata = {
          ...(existingPartner.metadata || {}),
          ...updateData.metadata
        };
      }
    }

    const partner = await Partner.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!partner) {
      return res.status(404).json({
        status: 'error',
        success: false,
        message: 'Partner not found'
      });
    }

    // Handle status-specific logic
    if (updateData.status === 'approved' && !partner.verification.isVerified) {
      partner.verification.isVerified = true;
      partner.verification.verifiedBy = req.user.id;
      partner.verification.verifiedAt = new Date();
      if (updateData.isActive === undefined) {
        partner.isActive = true;
      }
      await partner.save();
    }

    res.status(200).json({
      status: 'success',
      success: true,
      message: 'Partner updated successfully',
      data: partner
    });
  } catch (error) {
    console.error('Update partner error:', error);
    res.status(500).json({
      status: 'error',
      success: false,
      message: error.message || 'Failed to update partner'
    });
  }
};

// @desc    Get all donations
// @route   GET /api/admin/donations
// @access  Private/Admin
exports.getDonations = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      sortBy = '-createdAt'
    } = req.query;

    const query = {};
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const donations = await Donation.find(query)
      .populate('donor', 'name email')
      .populate('campaign', 'title fundraiser')
      .sort(sortBy)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Donation.countDocuments(query);

    res.status(200).json({
      status: 'success',
      results: donations.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      data: donations
    });
  } catch (error) {
    console.error('Get donations error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch donations'
    });
  }
};

// @desc    Get all coupons
// @route   GET /api/admin/coupons
// @access  Private/Admin
exports.getCoupons = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      sortBy = '-createdAt'
    } = req.query;

    const query = {};
    if (status) {
      if (status === 'inactive') {
        // For inactive, include all coupons that are not active
        // This includes: expired, cancelled, exhausted, inactive status, or expired validity
        query.$or = [
          { status: { $ne: 'active' } },
          { 'validity.isActive': false },
          { 'validity.endDate': { $lt: new Date() } }
        ];
      } else {
        query.status = status;
      }
    }
    if (category) query.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const coupons = await Coupon.find(query)
      .populate('issuer', 'name email')
      .populate('campaign', 'title')
      .populate({
        path: 'partner',
        select: 'name businessType category email phone',
        model: 'Partner'
      })
      .sort(sortBy)
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
    console.error('Get coupons error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch coupons'
    });
  }
};

// @desc    Get financial reports
// @route   GET /api/admin/reports/financial
// @access  Private/Admin
exports.getFinancialReports = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'month' } = req.query;

    const matchQuery = { status: 'completed' };
    if (startDate) matchQuery.createdAt = { ...matchQuery.createdAt, $gte: new Date(startDate) };
    if (endDate) matchQuery.createdAt = { ...matchQuery.createdAt, $lte: new Date(endDate) };

    // Overall stats
    const overallStats = await Donation.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalDonations: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          totalFees: { $sum: '$fees.totalFees' },
          avgDonation: { $avg: '$amount' }
        }
      }
    ]);

    // Group by time period
    let groupStage;
    if (groupBy === 'day') {
      groupStage = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    } else if (groupBy === 'week') {
      groupStage = { $week: '$createdAt' };
    } else {
      groupStage = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
    }

    const timeSeriesData = await Donation.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: groupStage,
          donations: { $sum: 1 },
          amount: { $sum: '$amount' },
          fees: { $sum: '$fees.totalFees' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Payment method breakdown
    const paymentMethodBreakdown = await Donation.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        overall: overallStats[0] || {},
        timeSeries: timeSeriesData,
        paymentMethods: paymentMethodBreakdown
      }
    });
  } catch (error) {
    console.error('Get financial reports error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch financial reports'
    });
  }
};

// @desc    Get analytics
// @route   GET /api/admin/analytics
// @access  Private/Admin
exports.getAnalytics = async (req, res) => {
  try {
    // User growth
    const userGrowth = await User.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 12 }
    ]);

    // Campaign performance
    const campaignStats = await Campaign.aggregate([
      { $match: { status: { $in: ['active', 'completed'] } } },
      {
        $project: {
          successRate: {
            $multiply: [
              { $divide: ['$currentAmount', '$goalAmount'] },
              100
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgSuccessRate: { $avg: '$successRate' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Top fundraisers
    const topFundraisers = await Campaign.aggregate([
      { $match: { status: { $in: ['active', 'completed'] } } },
      {
        $group: {
          _id: '$fundraiser',
          totalRaised: { $sum: '$currentAmount' },
          campaignCount: { $sum: 1 }
        }
      },
      { $sort: { totalRaised: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'fundraiserInfo'
        }
      },
      { $unwind: '$fundraiserInfo' },
      {
        $project: {
          name: '$fundraiserInfo.name',
          email: '$fundraiserInfo.email',
          totalRaised: 1,
          campaignCount: 1
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        userGrowth,
        campaignPerformance: campaignStats[0] || {},
        topFundraisers
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch analytics'
    });
  }
};






