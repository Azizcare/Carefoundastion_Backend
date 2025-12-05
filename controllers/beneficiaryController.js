const Beneficiary = require('../models/Beneficiary');
const Donation = require('../models/Donation');
const User = require('../models/User');

// @desc    Create beneficiary
// @route   POST /api/beneficiaries
// @access  Private/Admin
exports.createBeneficiary = async (req, res) => {
  try {
    const beneficiary = await Beneficiary.create({
      ...req.body,
      createdBy: req.user.id,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      data: beneficiary
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all beneficiaries
// @route   GET /api/beneficiaries
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
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const beneficiaries = await Beneficiary.find(query)
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .populate('verification.verifiedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: beneficiaries.length,
      data: beneficiaries
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single beneficiary
// @route   GET /api/beneficiaries/:id
// @access  Private/Admin
exports.getBeneficiary = async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .populate('verification.verifiedBy', 'name')
      .populate('donations.donation', 'amount status');

    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        message: 'Beneficiary not found'
      });
    }

    res.json({
      success: true,
      data: beneficiary
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update beneficiary
// @route   PUT /api/beneficiaries/:id
// @access  Private/Admin
exports.updateBeneficiary = async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findById(req.params.id);

    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        message: 'Beneficiary not found'
      });
    }

    Object.assign(beneficiary, req.body);
    beneficiary.updatedBy = req.user.id;
    await beneficiary.save();

    res.json({
      success: true,
      data: beneficiary
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Assign donation to beneficiary
// @route   POST /api/beneficiaries/:id/assign-donation
// @access  Private/Admin
exports.assignDonationToBeneficiary = async (req, res) => {
  try {
    const { donationId, amount } = req.body;
    const beneficiary = await Beneficiary.findById(req.params.id);

    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        message: 'Beneficiary not found'
      });
    }

    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    // Add donation to beneficiary
    beneficiary.donations.push({
      donation: donationId,
      amount,
      assignedAt: new Date(),
      status: 'assigned'
    });

    beneficiary.assignedAmount += amount;
    await beneficiary.save();

    // Update donation with beneficiary
    donation.beneficiary = beneficiary._id;
    donation.transparency.isAssignedToBeneficiary = true;
    donation.transparency.assignedAmount = amount;
    donation.transparency.assignedAt = new Date();
    await donation.save();

    res.json({
      success: true,
      message: 'Donation assigned to beneficiary successfully',
      data: beneficiary
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get beneficiary donations
// @route   GET /api/beneficiaries/:id/donations
// @access  Private/Admin
exports.getBeneficiaryDonations = async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findById(req.params.id)
      .populate('donations.donation');

    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        message: 'Beneficiary not found'
      });
    }

    res.json({
      success: true,
      count: beneficiary.donations.length,
      data: beneficiary.donations
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify beneficiary
// @route   PUT /api/beneficiaries/:id/verify
// @access  Private/Admin
exports.verifyBeneficiary = async (req, res) => {
  try {
    const { verificationNotes } = req.body;
    const beneficiary = await Beneficiary.findById(req.params.id);

    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        message: 'Beneficiary not found'
      });
    }

    beneficiary.verification.isVerified = true;
    beneficiary.verification.verifiedBy = req.user.id;
    beneficiary.verification.verifiedAt = new Date();
    beneficiary.verification.verificationNotes = verificationNotes;
    beneficiary.status = 'approved';

    await beneficiary.save();

    res.json({
      success: true,
      message: 'Beneficiary verified successfully',
      data: beneficiary
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

