const Donation = require('../models/Donation');
const Beneficiary = require('../models/Beneficiary');
const Campaign = require('../models/Campaign');

// @desc    Get donation transparency
// @route   GET /api/transparency/donations
// @access  Public
exports.getDonationTransparency = async (req, res) => {
  try {
    const { donorId, campaignId, beneficiaryId } = req.query;

    let query = { status: 'completed' };
    if (donorId) query.donor = donorId;
    if (campaignId) query.campaign = campaignId;
    if (beneficiaryId) query.beneficiary = beneficiaryId;

    const donations = await Donation.find(query)
      .populate('donor', 'name email')
      .populate('campaign', 'title description')
      .populate('beneficiary', 'name category')
      .sort({ createdAt: -1 });

    // Calculate transparency stats
    const totalDonated = donations.reduce((sum, d) => sum + d.amount, 0);
    const totalAssigned = donations
      .filter(d => d.transparency.isAssignedToBeneficiary)
      .reduce((sum, d) => sum + (d.transparency.assignedAmount || 0), 0);

    res.json({
      success: true,
      stats: {
        totalDonations: donations.length,
        totalDonated,
        totalAssigned,
        assignmentRate: totalDonated > 0 ? (totalAssigned / totalDonated * 100).toFixed(2) : 0
      },
      count: donations.length,
      data: donations
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get public transparency page data
// @route   GET /api/transparency/public
// @access  Public
exports.getPublicTransparencyPage = async (req, res) => {
  try {
    // Get overall stats
    const totalDonations = await Donation.countDocuments({ status: 'completed' });
    const totalAmount = await Donation.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalAssigned = await Donation.aggregate([
      { $match: { status: 'completed', 'transparency.isAssignedToBeneficiary': true } },
      { $group: { _id: null, total: { $sum: '$transparency.assignedAmount' } } }
    ]);

    // Get recent donations with transparency
    const recentDonations = await Donation.find({
      status: 'completed',
      'transparency.isAssignedToBeneficiary': true
    })
      .populate('donor', 'name')
      .populate('campaign', 'title')
      .populate('beneficiary', 'name category')
      .sort({ 'transparency.assignedAt': -1 })
      .limit(20);

    // Get beneficiary utilization
    const beneficiaries = await Beneficiary.find({ status: 'approved' })
      .select('name category assignedAmount receivedAmount')
      .sort({ assignedAmount: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        overall: {
          totalDonations,
          totalAmount: totalAmount[0]?.total || 0,
          totalAssigned: totalAssigned[0]?.total || 0,
          assignmentRate: totalAmount[0]?.total > 0 
            ? ((totalAssigned[0]?.total || 0) / totalAmount[0].total * 100).toFixed(2)
            : 0
        },
        recentDonations,
        topBeneficiaries: beneficiaries
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Assign donation to beneficiary
// @route   POST /api/transparency/assign-donation
// @access  Private/Admin
exports.assignDonationToBeneficiary = async (req, res) => {
  try {
    const { donationId, beneficiaryId, amount, utilizationDetails } = req.body;

    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    const beneficiary = await Beneficiary.findById(beneficiaryId);
    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        message: 'Beneficiary not found'
      });
    }

    // Update donation transparency
    donation.beneficiary = beneficiaryId;
    donation.transparency.isAssignedToBeneficiary = true;
    donation.transparency.assignedAmount = amount;
    donation.transparency.assignedAt = new Date();
    donation.transparency.utilizationDetails = utilizationDetails;
    await donation.save();

    // Update beneficiary
    beneficiary.donations.push({
      donation: donationId,
      amount,
      assignedAt: new Date(),
      status: 'assigned'
    });
    beneficiary.assignedAmount += amount;
    await beneficiary.save();

    res.json({
      success: true,
      message: 'Donation assigned to beneficiary successfully',
      data: {
        donation,
        beneficiary
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send utilization update to donor
// @route   POST /api/transparency/send-update
// @access  Private/Admin
exports.sendUtilizationUpdate = async (req, res) => {
  try {
    const { donationId, utilizationDetails } = req.body;

    const donation = await Donation.findById(donationId)
      .populate('donor', 'name email phone');

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    if (!donation.transparency.isAssignedToBeneficiary) {
      return res.status(400).json({
        success: false,
        message: 'Donation must be assigned to a beneficiary first'
      });
    }

    // Update utilization details
    donation.transparency.utilizationDetails = utilizationDetails || donation.transparency.utilizationDetails;
    donation.notifications.utilizationUpdateSent = true;
    await donation.save();

    // Send notification via WhatsApp/Email/SMS
    const { sendDonationUtilizationUpdate } = require('../utils/notificationService');
    await sendDonationUtilizationUpdate(donation, donation.donor, utilizationDetails);

    res.json({
      success: true,
      message: 'Utilization update sent to donor',
      data: donation
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

