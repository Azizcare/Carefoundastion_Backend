const User = require('../models/User');
const Donation = require('../models/Donation');

// @desc    Get referral code for user
// @route   GET /api/referrals/code
// @access  Private
exports.getReferralCode = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.referralCode) {
      // Generate if doesn't exist
      user.referralCode = user.generateReferralCode();
      await user.save({ validateBeforeSave: false });
    }

    res.status(200).json({
      status: 'success',
      data: {
        referralCode: user.referralCode,
        referralLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?ref=${user.referralCode}`,
        stats: user.referralStats || {
          totalReferrals: 0,
          totalReferralDonations: 0,
          referralRewards: 0
        }
      }
    });
  } catch (error) {
    console.error('Get referral code error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get referral code'
    });
  }
};

// @desc    Get referral statistics
// @route   GET /api/referrals/stats
// @access  Private
exports.getReferralStats = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    // Get all users referred by this user
    const referredUsers = await User.find({ referredBy: user._id })
      .select('name email role createdAt');

    // Get donations from referred users
    const referredUserIds = referredUsers.map(u => u._id);
    const referralDonations = await Donation.find({
      donor: { $in: referredUserIds },
      status: 'completed'
    }).populate('donor', 'name email');

    const totalReferralDonations = referralDonations.reduce(
      (sum, d) => sum + (d.amount || 0), 0
    );

    // Calculate rewards (example: 1% of referral donations)
    const rewardPercentage = 0.01;
    const referralRewards = totalReferralDonations * rewardPercentage;

    // Update user stats
    user.referralStats = {
      totalReferrals: referredUsers.length,
      totalReferralDonations: totalReferralDonations,
      referralRewards: referralRewards
    };
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      status: 'success',
      data: {
        referralCode: user.referralCode,
        stats: user.referralStats,
        referredUsers: referredUsers,
        referralDonations: referralDonations.length,
        recentReferrals: referredUsers.slice(0, 10) // Last 10 referrals
      }
    });
  } catch (error) {
    console.error('Get referral stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get referral statistics'
    });
  }
};

// @desc    Track referral during registration
// @route   POST /api/referrals/track
// @access  Public
exports.trackReferral = async (req, res) => {
  try {
    const { referralCode, userId } = req.body;

    if (!referralCode || !userId) {
      return res.status(400).json({
        status: 'error',
        message: 'Referral code and user ID are required'
      });
    }

    // Find referrer
    const referrer = await User.findOne({ referralCode: referralCode });
    if (!referrer) {
      return res.status(404).json({
        status: 'error',
        message: 'Invalid referral code'
      });
    }

    // Update new user
    const newUser = await User.findById(userId);
    if (!newUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    if (newUser.referredBy) {
      return res.status(400).json({
        status: 'error',
        message: 'User already has a referrer'
      });
    }

    // Set referrer
    newUser.referredBy = referrer._id;
    await newUser.save({ validateBeforeSave: false });

    // Update referrer stats
    referrer.referralStats.totalReferrals += 1;
    await referrer.save({ validateBeforeSave: false });

    res.status(200).json({
      status: 'success',
      message: 'Referral tracked successfully',
      data: {
        referrer: {
          name: referrer.name,
          referralCode: referrer.referralCode
        }
      }
    });
  } catch (error) {
    console.error('Track referral error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to track referral'
    });
  }
};

// @desc    Update referral stats when donation is made
// @route   POST /api/referrals/update-donation
// @access  Private (called internally)
exports.updateReferralDonation = async (donation) => {
  try {
    const donor = await User.findById(donation.donor);
    if (!donor || !donor.referredBy) {
      return; // No referrer
    }

    const referrer = await User.findById(donor.referredBy);
    if (!referrer) {
      return;
    }

    // Update referrer stats
    referrer.referralStats.totalReferralDonations += donation.amount || 0;
    
    // Calculate and update rewards (1% of donation)
    const rewardPercentage = 0.01;
    const reward = (donation.amount || 0) * rewardPercentage;
    referrer.referralStats.referralRewards += reward;
    
    await referrer.save({ validateBeforeSave: false });

    return {
      success: true,
      referrer: referrer.name,
      reward: reward
    };
  } catch (error) {
    console.error('Update referral donation error:', error);
    return { success: false, error: error.message };
  }
};

// @desc    Get all referrals (Admin)
// @route   GET /api/referrals/all
// @access  Private/Admin
exports.getAllReferrals = async (req, res) => {
  try {
    const users = await User.find({
      referralStats: { $exists: true },
      'referralStats.totalReferrals': { $gt: 0 }
    })
      .select('name email referralCode referralStats')
      .sort({ 'referralStats.totalReferrals': -1 });

    res.status(200).json({
      status: 'success',
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Get all referrals error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get referrals'
    });
  }
};

