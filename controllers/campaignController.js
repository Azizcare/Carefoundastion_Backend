const Campaign = require('../models/Campaign');
const User = require('../models/User');
const Donation = require('../models/Donation');

// @desc    Get all campaigns (Public with filters)
// @route   GET /api/campaigns
// @access  Public
exports.getCampaigns = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      status = 'active',
      featured,
      urgent,
      sortBy = '-createdAt',
      search,
      minGoal,
      maxGoal,
      city,
      state
    } = req.query;

    // Build query
    const query = {};

    // Status filter (public can only see active/completed)
    if (req.user && req.user.role === 'admin') {
      if (status) query.status = status;
    } else {
      query.status = { $in: ['active', 'completed'] };
      query.isActive = true;
    }

    // Category filter
    if (category) query.category = category;

    // Featured filter
    if (featured === 'true') query.isFeatured = true;

    // Urgent filter
    if (urgent === 'true') query.isUrgent = true;

    // Goal amount range
    if (minGoal) query.goalAmount = { ...query.goalAmount, $gte: parseInt(minGoal) };
    if (maxGoal) query.goalAmount = { ...query.goalAmount, $lte: parseInt(maxGoal) };

    // Location filters
    if (city) query['location.city'] = new RegExp(city, 'i');
    if (state) query['location.state'] = new RegExp(state, 'i');

    // Search filter
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { shortDescription: new RegExp(search, 'i') },
        { tags: new RegExp(search, 'i') }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Handle sort options
    let sortOption = sortBy;
    if (sortBy === 'popularity') {
      // Sort by a combination of factors: shares, donations, and amount raised
      sortOption = { 'analytics.shares': -1, 'analytics.donations': -1, currentAmount: -1 };
    }

    // Execute query
    const campaigns = await Campaign.find(query)
      .populate('fundraiser', 'name email avatar')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count
    const total = await Campaign.countDocuments(query);

    // Calculate virtual fields
    const campaignsWithVirtuals = campaigns.map(campaign => ({
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
      data: campaignsWithVirtuals
    });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch campaigns'
    });
  }
};

// @desc    Get single campaign
// @route   GET /api/campaigns/:id
// @access  Public
exports.getCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('fundraiser', 'name email phone avatar address socialLinks')
      .populate('verification.verifiedBy', 'name');

    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found'
      });
    }

    // Check if user has permission to view (if campaign is not active)
    if (campaign.status !== 'active' && campaign.status !== 'completed') {
      if (!req.user || (req.user._id.toString() !== campaign.fundraiser._id.toString() && req.user.role !== 'admin')) {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have permission to view this campaign'
        });
      }
    }

    // Increment view count
    campaign.analytics.views += 1;
    await campaign.save();

    // Get campaign donations for display
    const donations = await Donation.find({ 
      campaign: campaign._id, 
      status: 'completed' 
    })
      .populate('donor', 'name avatar')
      .sort('-createdAt')
      .limit(10)
      .lean();

    // Calculate virtuals
    const campaignData = campaign.toObject();
    campaignData.progressPercentage = Math.round((campaign.currentAmount / campaign.goalAmount) * 100);
    campaignData.daysRemaining = Math.max(0, Math.ceil((new Date(campaign.timeline.endDate) - new Date()) / (1000 * 60 * 60 * 24)));
    campaignData.recentDonations = donations;

    res.status(200).json({
      status: 'success',
      data: campaignData
    });
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch campaign'
    });
  }
};

// @desc    Create new campaign
// @route   POST /api/campaigns
// @access  Private (Fundraiser)
exports.createCampaign = async (req, res) => {
  try {
    // Add fundraiser ID from authenticated user
    req.body.fundraiser = req.user.id;

    // Set initial status based on user role and verification
    // According to requirements: Campaign review and approval system
    // All user-created campaigns should be pending for admin review
    if (req.user.role === 'admin') {
      // Admin-created campaigns are automatically active
      req.body.status = 'active';
      req.body.verification = {
        isVerified: true,
        verifiedBy: req.user.id,
        verifiedAt: new Date(),
        verificationNotes: 'Auto-verified (Admin created)'
      };
    } else {
      // All fundraiser-created campaigns MUST start as 'pending' for admin review
      // Force status to 'pending' to override any default - CRITICAL for approval workflow
      req.body.status = 'pending';
      req.body.isActive = false; // Explicitly set to false - campaigns should be inactive until approved
      
      console.log('=== Campaign Creation - Fundraiser User ===');
      console.log('User role:', req.user.role);
      console.log('User ID:', req.user.id);
      console.log('Setting status to:', req.body.status);
      console.log('Setting isActive to:', req.body.isActive);
    }
    
    // Log the status being set
    console.log('Campaign creation - Final status:', req.body.status, 'for user role:', req.user.role);

    // Log the campaign data for debugging
    console.log('Creating campaign with data:', {
      title: req.body.title,
      fundraiser: req.body.fundraiser,
      status: req.body.status, // Log the status we're setting
      beneficiary: req.body.beneficiary?.name,
      imagesCount: req.body.images?.length || 0,
      goalAmount: req.body.goalAmount
    });

    // Create campaign with explicit status
    // CRITICAL: Explicitly set status and isActive to override model defaults
    // For fundraisers, ALWAYS set to pending - no exceptions
    const campaignData = {
      ...req.body,
      // CRITICAL: Force status to 'pending' for non-admin users, regardless of what was sent
      status: req.user.role === 'admin' ? (req.body.status || 'active') : 'pending',
      // CRITICAL: Force isActive to false for non-admin users
      isActive: req.user.role === 'admin' ? (req.body.isActive !== undefined ? req.body.isActive : true) : false
    };
    
    console.log('=== Campaign Data Before Create ===');
    console.log('User role:', req.user.role);
    console.log('Status (forced):', campaignData.status);
    console.log('isActive (forced):', campaignData.isActive);
    console.log('Fundraiser:', campaignData.fundraiser);
    
    const campaign = await Campaign.create(campaignData);
    
    console.log('=== Campaign Created ===');
    console.log('Campaign ID:', campaign._id);
    console.log('Final status:', campaign.status);
    console.log('Final isActive:', campaign.isActive);
    
    // CRITICAL SAFETY CHECK: Verify the status was saved correctly
    // If somehow the status is wrong, force fix it immediately
    if (req.user.role !== 'admin') {
      if (campaign.status !== 'pending') {
        console.error('⚠️ CRITICAL ERROR: Campaign status is not "pending"! Expected pending, got:', campaign.status);
        console.error('⚠️ Forcing status to pending and isActive to false...');
        // Force update if wrong - this should never happen but safety check
        campaign.status = 'pending';
        campaign.isActive = false;
        await campaign.save();
        console.log('✅ Fixed: Status updated to pending, isActive set to false');
      }
      if (campaign.isActive !== false) {
        console.error('⚠️ CRITICAL ERROR: Campaign isActive is true! Expected false, got:', campaign.isActive);
        campaign.isActive = false;
        await campaign.save();
        console.log('✅ Fixed: isActive set to false');
      }
    }

    res.status(201).json({
      status: 'success',
      message: 'Campaign created successfully',
      data: campaign
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message,
        value: error.errors[key].value
      }));
      
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'Duplicate entry. This campaign may already exist.'
      });
    }

    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to create campaign'
    });
  }
};

// @desc    Update campaign
// @route   PUT /api/campaigns/:id
// @access  Private
exports.updateCampaign = async (req, res) => {
  try {
    let campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found'
      });
    }

    // Check ownership or admin
    if (campaign.fundraiser.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to update this campaign'
      });
    }

    // Prevent updating certain fields once campaign is active
    if (campaign.status === 'active') {
      const restrictedFields = ['goalAmount', 'category', 'beneficiary'];
      restrictedFields.forEach(field => {
        if (req.body[field]) delete req.body[field];
      });
    }

    campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'Campaign updated successfully',
      data: campaign
    });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to update campaign'
    });
  }
};

// @desc    Delete campaign
// @route   DELETE /api/campaigns/:id
// @access  Private
exports.deleteCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found'
      });
    }

    // Check ownership or admin
    if (campaign.fundraiser.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to delete this campaign'
      });
    }

    // Prevent deletion if campaign has donations
    const donationsCount = await Donation.countDocuments({ campaign: campaign._id });
    if (donationsCount > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete campaign with existing donations. You can pause it instead.'
      });
    }

    await campaign.deleteOne();

    res.status(200).json({
      status: 'success',
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete campaign'
    });
  }
};

// @desc    Get campaign donations
// @route   GET /api/campaigns/:id/donations
// @access  Public
exports.getCampaignDonations = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const donations = await Donation.find({
      campaign: req.params.id,
      status: 'completed'
    })
      .populate('donor', 'name avatar')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Donation.countDocuments({
      campaign: req.params.id,
      status: 'completed'
    });

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
    console.error('Get campaign donations error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch campaign donations'
    });
  }
};

// @desc    Add campaign update
// @route   POST /api/campaigns/:id/updates
// @access  Private
exports.addCampaignUpdate = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found'
      });
    }

    // Check ownership or admin
    if (campaign.fundraiser.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to update this campaign'
      });
    }

    const { title, description, images, isPublic = true } = req.body;

    campaign.updates.push({
      title,
      description,
      images: images || [],
      isPublic,
      date: new Date()
    });

    await campaign.save();

    // TODO: Send notifications to donors about the update

    res.status(201).json({
      status: 'success',
      message: 'Campaign update added successfully',
      data: campaign.updates[campaign.updates.length - 1]
    });
  } catch (error) {
    console.error('Add campaign update error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to add campaign update'
    });
  }
};

// @desc    Get campaign analytics
// @route   GET /api/campaigns/:id/analytics
// @access  Private
exports.getCampaignAnalytics = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found'
      });
    }

    // Check ownership or admin
    if (campaign.fundraiser.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to view analytics'
      });
    }

    // Get donation statistics
    const donationStats = await Donation.getStats({ campaign: campaign._id });

    // Get donor demographics
    const topDonors = await Donation.aggregate([
      { $match: { campaign: campaign._id, status: 'completed' } },
      { 
        $group: {
          _id: '$donor',
          totalDonated: { $sum: '$amount' },
          donationCount: { $sum: 1 }
        }
      },
      { $sort: { totalDonated: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'donorInfo'
        }
      },
      { $unwind: '$donorInfo' },
      {
        $project: {
          name: '$donorInfo.name',
          avatar: '$donorInfo.avatar',
          totalDonated: 1,
          donationCount: 1
        }
      }
    ]);

    // Daily donation trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyTrend = await Donation.aggregate([
      {
        $match: {
          campaign: campaign._id,
          status: 'completed',
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const analytics = {
      overview: {
        views: campaign.analytics.views,
        uniqueViews: campaign.analytics.uniqueViews,
        shares: campaign.analytics.shares,
        donations: donationStats.totalDonations,
        totalRaised: campaign.currentAmount,
        avgDonation: donationStats.avgAmount,
        progressPercentage: Math.round((campaign.currentAmount / campaign.goalAmount) * 100),
        daysRemaining: Math.max(0, Math.ceil((new Date(campaign.timeline.endDate) - new Date()) / (1000 * 60 * 60 * 24)))
      },
      socialSharing: campaign.socialSharing,
      topDonors,
      dailyTrend,
      donationStats
    };

    res.status(200).json({
      status: 'success',
      data: analytics
    });
  } catch (error) {
    console.error('Get campaign analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch campaign analytics'
    });
  }
};

// @desc    Increment social share count
// @route   POST /api/campaigns/:id/share
// @access  Public
exports.incrementShare = async (req, res) => {
  try {
    const { platform } = req.body; // facebook, twitter, whatsapp, linkedin

    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found'
      });
    }

    if (platform && campaign.socialSharing[platform] !== undefined) {
      campaign.socialSharing[platform] += 1;
    }
    campaign.socialSharing.total += 1;
    campaign.analytics.shares += 1;

    await campaign.save();

    res.status(200).json({
      status: 'success',
      message: 'Share recorded successfully'
    });
  } catch (error) {
    console.error('Increment share error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to record share'
    });
  }
};

// @desc    Get campaign statistics (Public stats)
// @route   GET /api/campaigns/stats
// @access  Public
exports.getCampaignStats = async (req, res) => {
  try {
    // Get total raised amount from completed donations
    const donationStats = await Donation.aggregate([
      {
        $match: { status: 'completed' }
      },
      {
        $group: {
          _id: null,
          totalRaised: { $sum: '$amount' },
          totalDonors: { $addToSet: '$donor' }
        }
      }
    ]);

    // Get active campaigns count
    const activeCampaigns = await Campaign.countDocuments({
      status: 'active',
      isActive: true
    });

    // Get total donors count
    const totalDonors = donationStats[0]?.totalDonors?.length || 0;

    // Get total raised
    const totalRaised = donationStats[0]?.totalRaised || 0;

    // Calculate lives impacted (approximation: 1 donation = 1 life impacted, or based on campaigns)
    const completedCampaigns = await Campaign.countDocuments({
      status: 'completed'
    });
    const livesImpacted = Math.max(totalDonors, completedCampaigns * 10); // Approximation

    res.status(200).json({
      status: 'success',
      data: {
        totalRaised,
        activeCampaigns,
        totalDonors,
        livesImpacted
      }
    });
  } catch (error) {
    console.error('Get campaign stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch campaign statistics'
    });
  }
};


