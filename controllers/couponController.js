const QRCode = require('qrcode');
const Coupon = require('../models/Coupon');
const Partner = require('../models/Partner');
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const { sendCouponNotification } = require('../utils/notificationService');
const { getCouponPackageById, getCouponPackages } = require('../config/couponPackages');

// Helper function to get coupon monetary value for wallet
// For percentage coupons, returns 0 (will be calculated on redemption)
// For amount-based coupons, returns the amount
const getCouponMonetaryValue = (coupon) => {
  if (!coupon || !coupon.value) {
    return 0;
  }
  
  const value = coupon.value;
  
  // If percentage-based, return 0 (actual value calculated on redemption)
  if (value.isPercentage || value.percentage) {
    return 0; // Will be calculated when coupon is redeemed with purchase amount
  }
  
  // If amount is a number, return it
  if (value.amount && typeof value.amount === 'number') {
    return value.amount;
  }
  
  // For free_item/service, return 0 (no monetary value)
  return 0;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const buildCouponPayloadFromPackage = async ({
  pkg,
  donorId,
  partnerId,
  beneficiary,
  assignBeneficiary,
  paymentReferences,
  sequenceIndex = 0
}) => {
  if (!pkg) {
    throw new Error('Coupon package data is required');
  }

  const now = new Date();
  const validityDays = Math.max(1, pkg.validityDays || 30);
  const expiresAt = new Date(now.getTime() + validityDays * MS_PER_DAY);
  const codePrefix = pkg.codePrefix || (pkg.id || 'CPKG').substring(0, 4);
  const code = await Coupon.generateUniqueCode(codePrefix);
  const qrPayload = {
    code,
    packageId: pkg.id,
    category: pkg.category,
    amount: pkg.amount,
    validUntil: expiresAt
  };
  const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrPayload), {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    width: 280,
    margin: 1
  });

  const baseTxnId = paymentReferences?.transactionId || `COUPON-${pkg.id || 'CUSTOM'}`;
  const transactionId = `${baseTxnId}-${code}-${sequenceIndex + 1}`;

  const payload = {
    code,
    title: pkg.title,
    description: pkg.description,
    category: pkg.category,
    type: pkg.type,
    value: {
      amount: pkg.amount,
      currency: pkg.currency || 'INR'
    },
    issuer: donorId,
    donor: donorId,
    partner: partnerId || null,
    validity: {
      startDate: now,
      endDate: expiresAt,
      isActive: true
    },
    usage: {
      maxUses: pkg.maxUses || 1,
      usedCount: 0,
      isUnlimited: Boolean(pkg.isUnlimited)
    },
    stage: 'CREATED',
    status: 'active',
    qrCode: {
      url: qrCodeUrl,
      data: JSON.stringify(qrPayload)
    },
    packageId: pkg.id,
    packageTitle: pkg.title,
    packageDescription: pkg.description,
    packageAmount: pkg.amount,
    packageCategory: pkg.category,
    packageValidityDays: validityDays,
    paymentReferences: {
      transactionId,
      gateway: paymentReferences?.gateway || 'coupon',
      gatewayId: paymentReferences?.gatewayId,
      gatewayReference: paymentReferences?.gatewayReference,
      gatewayDetails: paymentReferences?.gatewayDetails
    },
    fraudPrevention: {
      isVerified: true,
      verificationMethod: 'manual',
      maxRedemptionsPerDay: pkg.maxRedemptionsPerDay || 1
    }
  };

  const beneficiaryPayload = {};
  if (beneficiary?.name) {
    beneficiaryPayload.name = beneficiary.name.trim();
    payload.beneficiaryName = beneficiaryPayload.name;
  }
  if (beneficiary?.phone) {
    beneficiaryPayload.phone = beneficiary.phone.trim();
    payload.beneficiaryPhone = beneficiaryPayload.phone;
  }
  if (beneficiary?.email) {
    beneficiaryPayload.email = beneficiary.email.toLowerCase().trim();
  }
  if (Object.keys(beneficiaryPayload).length) {
    payload.beneficiary = beneficiaryPayload;
  }

  if (assignBeneficiary && Object.keys(beneficiaryPayload).length) {
    payload.assignedAt = new Date();
    payload.assignedBy = donorId;
  }

  return payload;
};

// @desc    Get all coupons
// @route   GET /api/coupons
// @access  Public (filtered)
exports.getCoupons = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      type,
      status = 'active',
      isPublic = true,
      sortBy = '-createdAt'
    } = req.query;

    const query = {};

    // Public can only see active and public coupons
    if (!req.user || req.user.role !== 'admin') {
      query.status = 'active';
      query.isPublic = true;
      query['validity.isActive'] = true;
      query['validity.endDate'] = { $gte: new Date() };
    } else {
      if (status) query.status = status;
    }

    if (category) query.category = category;
    if (type) query.type = type;

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

    // Add virtual fields
    const couponsWithVirtuals = coupons.map(coupon => ({
      ...coupon,
      remainingUses: coupon.usage.isUnlimited ? 'Unlimited' : Math.max(0, coupon.usage.maxUses - coupon.usage.usedCount),
      daysRemaining: Math.max(0, Math.ceil((new Date(coupon.validity.endDate) - new Date()) / (1000 * 60 * 60 * 24)))
    }));

    res.status(200).json({
      status: 'success',
      results: coupons.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      data: couponsWithVirtuals
    });
  } catch (error) {
    console.error('Get coupons error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch coupons'
    });
  }
};

// @desc    Get single coupon
// @route   GET /api/coupons/:id
// @access  Public
exports.getCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id)
      .populate('issuer', 'name email phone')
      .populate('campaign', 'title description')
      .populate('partner', 'name businessType address services');

    if (!coupon) {
      return res.status(404).json({
        status: 'error',
        message: 'Coupon not found'
      });
    }

    // Check visibility
    if (!coupon.isPublic && (!req.user || (req.user.id !== coupon.issuer._id.toString() && req.user.role !== 'admin'))) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to view this coupon'
      });
    }

    // Increment view count
    coupon.analytics.views += 1;
    await coupon.save();

    const couponData = coupon.toObject();
    couponData.remainingUses = coupon.usage.isUnlimited ? 'Unlimited' : Math.max(0, coupon.usage.maxUses - coupon.usage.usedCount);
    couponData.daysRemaining = Math.max(0, Math.ceil((new Date(coupon.validity.endDate) - new Date()) / (1000 * 60 * 60 * 24)));

    res.status(200).json({
      status: 'success',
      data: couponData
    });
  } catch (error) {
    console.error('Get coupon error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch coupon'
    });
  }
};

// @desc    Create new coupon
// @route   POST /api/coupons
// @access  Private
exports.createCoupon = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      type,
      value,
      campaign,
      partner,
      beneficiary,
      validity,
      usage,
      conditions,
      terms,
      isPublic = true
    } = req.body;

    // Add issuer
    req.body.issuer = req.user.id;

    // Generate unique coupon code
    const couponCode = await Coupon.generateUniqueCode(category.substring(0, 3).toUpperCase());
    req.body.code = couponCode;

    // Generate QR code
    const qrCodeData = JSON.stringify({
      code: couponCode,
      category: category,
      value: value,
      validUntil: validity.endDate
    });

    const qrCodeUrl = await QRCode.toDataURL(qrCodeData, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 1
    });

    req.body.qrCode = {
      url: qrCodeUrl,
      data: qrCodeData
    };

    // Set fraud prevention defaults
    req.body.fraudPrevention = {
      isVerified: true,
      verificationMethod: 'manual',
      maxRedemptionsPerDay: 1
    };

    // Track stage for donor/beneficiary flow
    req.body.stage = 'CREATED';
    req.body.stageHistory = [{
      stage: 'CREATED',
      changedAt: new Date(),
      changedBy: req.user.id,
      notes: 'Coupon created'
    }];
    req.body.donor = req.body.donor || req.user.id;

    // Set status to active by default if not provided
    if (!req.body.status) {
      req.body.status = 'active';
    }

    // Set validity.isActive to true if validity dates are valid
    if (req.body.validity && req.body.validity.startDate && req.body.validity.endDate) {
      const startDate = new Date(req.body.validity.startDate);
      const endDate = new Date(req.body.validity.endDate);
      const now = new Date();
      
      // Only set isActive if dates are valid and not in the past
      if (endDate >= now) {
        req.body.validity.isActive = true;
      }
    }

    const coupon = await Coupon.create(req.body);

    res.status(201).json({
      status: 'success',
      message: 'Coupon created successfully',
      data: coupon
    });
  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to create coupon'
    });
  }
};

exports.getCouponPackages = (req, res) => {
  try {
    const packages = getCouponPackages();
    res.status(200).json({
      status: 'success',
      results: packages.length,
      data: packages
    });
  } catch (error) {
    console.error('Get coupon packages error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to load coupon packages'
    });
  }
};

exports.purchaseCoupons = async (req, res) => {
  try {
    const {
      packageId,
      quantity = 1,
      partnerId,
      beneficiaryName,
      beneficiaryPhone,
      beneficiaryEmail,
      assignBeneficiary = false,
      paymentReferences = {}
    } = req.body;

    const couponPackage = getCouponPackageById(packageId);
    if (!couponPackage) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid coupon package selected'
      });
    }

    const parsedQuantity = Math.min(Math.max(parseInt(quantity, 10) || 1, 1), 50);
    const donorId = req.user?.id;

    if (!donorId) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required to purchase coupons'
      });
    }

    const beneficiary = {
      name: beneficiaryName?.trim(),
      phone: beneficiaryPhone?.trim(),
      email: beneficiaryEmail ? beneficiaryEmail.toLowerCase().trim() : undefined
    };
    const shouldAssignBeneficiary = Boolean(assignBeneficiary) && Boolean(beneficiary.name || beneficiary.phone || beneficiary.email);

    const createdCoupons = [];

    for (let i = 0; i < parsedQuantity; i += 1) {
      const payload = await buildCouponPayloadFromPackage({
        pkg: couponPackage,
        donorId,
        partnerId,
        beneficiary,
        assignBeneficiary: shouldAssignBeneficiary,
        paymentReferences,
        sequenceIndex: i
      });
      const coupon = await Coupon.create(payload);
      createdCoupons.push(coupon);
    }

    res.status(201).json({
      status: 'success',
      message: `${createdCoupons.length} coupon(s) created successfully`,
      data: {
        package: couponPackage,
        coupons: createdCoupons
      }
    });
  } catch (error) {
    console.error('Purchase coupons error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to create coupons'
    });
  }
};

// @desc    Assign coupon to beneficiary (donor or admin)
// @route   POST /api/coupons/:id/assign
// @access  Private (donor/admin)
exports.assignCoupon = async (req, res) => {
  try {
    const { beneficiaryName, beneficiaryPhone, beneficiaryEmail, partnerId } = req.body;

    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({
        status: 'error',
        message: 'Coupon not found'
      });
    }

    const allowedStages = ['CREATED', 'ASSIGNED'];
    if (!allowedStages.includes(coupon.stage)) {
      return res.status(400).json({
        status: 'error',
        message: 'Coupon cannot be assigned in its current stage'
      });
    }

    if (req.user.role !== 'admin' && coupon.issuer.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only assign your own coupons'
      });
    }

    coupon.beneficiary = coupon.beneficiary || {};

    if (beneficiaryName) {
      coupon.beneficiary.name = beneficiaryName.trim();
      coupon.beneficiaryName = beneficiaryName.trim();
    }
    if (beneficiaryPhone) {
      coupon.beneficiary.phone = beneficiaryPhone.trim();
      coupon.beneficiaryPhone = beneficiaryPhone.trim();
    }
    if (beneficiaryEmail) {
      coupon.beneficiary.email = beneficiaryEmail.toLowerCase().trim();
    }

    if (partnerId) {
      coupon.partner = partnerId;
    }

    coupon.assignedAt = new Date();
    coupon.assignedBy = req.user.id;
    coupon.recordStageChange('ASSIGNED', req.user.id, 'Assigned to beneficiary');

    await coupon.save();

    res.status(200).json({
      status: 'success',
      message: 'Coupon assigned to beneficiary',
      data: coupon
    });
  } catch (error) {
    console.error('Assign coupon error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to assign coupon'
    });
  }
};

// @desc    Mark coupon as settled after admin approves payout
// @route   POST /api/coupons/:id/settle
// @access  Private/Admin
exports.settleCoupon = async (req, res) => {
  try {
    const { amount, referenceNo, notes } = req.body;
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        status: 'error',
        message: 'Coupon not found'
      });
    }

    if (coupon.stage !== 'REDEEMED_PENDING_SETTLEMENT') {
      return res.status(400).json({
        status: 'error',
        message: 'Only redeemed coupons can be settled'
      });
    }

    const latestRedemption = coupon.redemptions[coupon.redemptions.length - 1];
    const payableAmount = parseFloat(amount ?? latestRedemption?.amount ?? 0);

    coupon.settlement = {
      payableAmount,
      approvedBy: req.user.id,
      referenceNo: referenceNo || '',
      paidOn: new Date()
    };
    coupon.settledAt = new Date();
    coupon.recordStageChange('SETTLED', req.user.id, notes || 'Settlement approved');
    await coupon.save();

    res.status(200).json({
      status: 'success',
      message: 'Coupon settled successfully',
      data: coupon
    });
  } catch (error) {
    console.error('Settle coupon error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to settle coupon'
    });
  }
};

// @desc    Reject or cancel coupon (fraud, invalid QR, refund)
// @route   POST /api/coupons/:id/reject
// @access  Private/Admin|Partner
exports.rejectCoupon = async (req, res) => {
  try {
    const { reason, markAs = 'REJECTED' } = req.body;
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        status: 'error',
        message: 'Coupon not found'
      });
    }

    if (coupon.stage === 'SETTLED') {
      return res.status(400).json({
        status: 'error',
        message: 'Settled coupons cannot be rejected'
      });
    }

    const targetStage = markAs === 'CANCELLED' ? 'CANCELLED' : 'REJECTED';
    coupon.rejectionReason = reason || 'Rejected by partner/admin';
    coupon.recordStageChange(targetStage, req.user.id, reason || 'Coupon rejected');
    coupon.status = 'cancelled';

    await coupon.save();

    res.status(200).json({
      status: 'success',
      message: 'Coupon rejected',
      data: coupon
    });
  } catch (error) {
    console.error('Reject coupon error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to reject coupon'
    });
  }
};

// @desc    Update coupon
// @route   PUT /api/coupons/:id
// @access  Private
exports.updateCoupon = async (req, res) => {
  try {
    let coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        status: 'error',
        message: 'Coupon not found'
      });
    }

    // Check ownership or admin
    if (coupon.issuer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to update this coupon'
      });
    }

    // Prevent updating certain fields if coupon has been used
    if (coupon.usage.usedCount > 0) {
      const restrictedFields = ['value', 'type', 'category'];
      restrictedFields.forEach(field => {
        if (req.body[field]) delete req.body[field];
      });
    }

    coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'Coupon updated successfully',
      data: coupon
    });
  } catch (error) {
    console.error('Update coupon error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to update coupon'
    });
  }
};

// @desc    Delete coupon
// @route   DELETE /api/coupons/:id
// @access  Private
exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        status: 'error',
        message: 'Coupon not found'
      });
    }

    // Check ownership or admin
    if (coupon.issuer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to delete this coupon'
      });
    }

    // Can only delete unused coupons
    if (coupon.usage.usedCount > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete coupon that has been redeemed. You can deactivate it instead.'
      });
    }

    await coupon.deleteOne();

    res.status(200).json({
      status: 'success',
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete coupon'
    });
  }
};

// @desc    Redeem coupon
// @route   POST /api/coupons/:id/redeem
// @access  Private
exports.redeemCoupon = async (req, res) => {
  try {
    const { partnerId, location, notes } = req.body;

    const coupon = await Coupon.findById(req.params.id)
      .populate('partner');

    if (!coupon) {
      return res.status(404).json({
        status: 'error',
        message: 'Coupon not found'
      });
    }

    // Validate coupon is redeemable
    if (!coupon.isRedeemable()) {
      return res.status(400).json({
        status: 'error',
        message: 'Coupon is not valid or has expired'
      });
    }

    // Check if user is partner (for partner redemptions)
    if (req.user.role === 'partner') {
      const partner = await Partner.findOne({ email: req.user.email });
      if (!partner || (coupon.partner && coupon.partner._id.toString() !== partner._id.toString())) {
        return res.status(403).json({
          status: 'error',
          message: 'You are not authorized to redeem this coupon'
        });
      }
    }

    // Check daily redemption limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRedemptions = coupon.redemptions.filter(r => {
      const redemptionDate = new Date(r.redeemedAt);
      redemptionDate.setHours(0, 0, 0, 0);
      return redemptionDate.getTime() === today.getTime();
    }).length;

    if (todayRedemptions >= coupon.fraudPrevention.maxRedemptionsPerDay) {
      return res.status(400).json({
        status: 'error',
        message: 'Daily redemption limit reached for this coupon'
      });
    }

    // Calculate redemption amount
    let redemptionAmount = getCouponMonetaryValue(coupon);
    
    // If percentage-based, we need purchase amount to calculate
    // For now, if percentage, we'll use 0 and update wallet separately
    // In real scenario, purchase amount should be passed in req.body
    if (coupon.value.isPercentage || coupon.value.percentage) {
      const purchaseAmount = req.body.purchaseAmount || 0;
      if (purchaseAmount > 0) {
        redemptionAmount = (purchaseAmount * coupon.value.percentage) / 100;
      } else {
        redemptionAmount = 0; // Will be updated when actual purchase is made
      }
    }

    // Redeem coupon
    const redemptionData = {
      redeemedBy: req.user.id,
      redeemedAt: new Date(),
      amount: redemptionAmount,
      partner: partnerId || coupon.partner,
      location: location || {},
      notes: notes || ''
    };

    await coupon.redeem(redemptionData);

    // Update wallet if partner is involved
    if (partnerId || coupon.partner) {
      const finalPartnerId = partnerId || coupon.partner;
      const partner = await Partner.findById(finalPartnerId);
      
      if (partner && partner.user) {
        const wallet = await Wallet.findOne({ vendor: partner.user });
        
        if (wallet) {
          // Update coupon status in wallet
          const couponEntry = wallet.coupons.find(
            c => c.coupon.toString() === coupon._id.toString()
          );
          
          if (couponEntry && couponEntry.status === 'pending') {
            await wallet.redeemCoupon(coupon._id, redemptionAmount);
            
            // Add redemption transaction
            await wallet.addTransaction({
              type: 'coupon_redeemed',
              amount: redemptionAmount,
              coupon: coupon._id,
              description: `Coupon ${coupon.code} redeemed`,
              processedBy: req.user.id,
              status: 'completed'
            });
          }
        }
        
        // Update partner analytics
        if (partner) {
          partner.analytics.totalRedemptions += 1;
          partner.analytics.totalRevenue += redemptionAmount;
          await partner.save();
        }
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Coupon redeemed successfully',
      data: {
        couponCode: coupon.code,
        remainingUses: coupon.usage.isUnlimited ? 'Unlimited' : coupon.usage.maxUses - coupon.usage.usedCount
      }
    });
  } catch (error) {
    console.error('Redeem coupon error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to redeem coupon'
    });
  }
};

// @desc    Get coupon by code
// @route   GET /api/coupons/code/:code
// @access  Public
exports.getCouponByCode = async (req, res) => {
  try {
    const { code } = req.params;

    // Validate code format (should not be empty)
    if (!code || !code.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Coupon code is required'
      });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() })
      .populate('issuer', 'name email')
      .populate('campaign', 'title')
      .populate('partner', 'name businessType address');

    if (!coupon) {
      return res.status(404).json({
        status: 'error',
        message: 'Invalid coupon code. Please check the code and try again.'
      });
    }

    // Check if coupon is public or user has access
    if (!coupon.isPublic && (!req.user || (req.user.id !== coupon.issuer._id.toString() && req.user.role !== 'admin'))) {
      return res.status(403).json({
        status: 'error',
        message: 'This coupon is not publicly available'
      });
    }

    // Check if coupon is redeemable
    const now = new Date();
    const startDate = new Date(coupon.validity.startDate);
    const endDate = new Date(coupon.validity.endDate);
    const isRedeemable = coupon.isRedeemable();
    
    if (!isRedeemable) {
      // Determine why it's not redeemable
      let reason = 'Coupon is not valid';
      if (now < startDate) {
        reason = 'Coupon is not yet active';
      } else if (now > endDate) {
        reason = 'Coupon has expired';
      } else if (coupon.status !== 'active') {
        reason = `Coupon is ${coupon.status}`;
      } else if (!coupon.usage.isUnlimited && coupon.usage.usedCount >= coupon.usage.maxUses) {
        reason = 'Coupon usage limit reached';
      }

      return res.status(400).json({
        status: 'error',
        message: reason,
        data: {
          code: coupon.code,
          title: coupon.title,
          status: coupon.status,
          validFrom: coupon.validity.startDate,
          validUntil: coupon.validity.endDate,
          usedCount: coupon.usage.usedCount,
          maxUses: coupon.usage.maxUses
        }
      });
    }

    const couponData = coupon.toObject();
    couponData.remainingUses = coupon.usage.isUnlimited ? 'Unlimited' : Math.max(0, coupon.usage.maxUses - coupon.usage.usedCount);
    couponData.isRedeemable = true;
    couponData.daysRemaining = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));

    res.status(200).json({
      status: 'success',
      message: 'Coupon is valid',
      data: couponData
    });
  } catch (error) {
    console.error('Get coupon by code error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch coupon. Please try again.'
    });
  }
};

// @desc    Get user's coupons
// @route   GET /api/coupons/my-coupons
// @access  Private
exports.getMyCoupons = async (req, res) => {
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
    console.error('Get my coupons error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch coupons'
    });
  }
};

// @desc    Get coupon analytics
// @route   GET /api/coupons/:id/analytics
// @access  Private
exports.getCouponAnalytics = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        status: 'error',
        message: 'Coupon not found'
      });
    }

    // Check permission
    if (coupon.issuer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to view analytics'
      });
    }

    // Calculate redemption rate
    const redemptionRate = coupon.usage.maxUses > 0 
      ? Math.round((coupon.usage.usedCount / coupon.usage.maxUses) * 100)
      : 0;

    // Get redemption timeline
    const redemptionTimeline = coupon.redemptions.map(r => ({
      date: r.redeemedAt,
      amount: r.amount,
      partner: r.partner
    }));

    // Group redemptions by date
    const dailyRedemptions = {};
    coupon.redemptions.forEach(r => {
      const date = new Date(r.redeemedAt).toISOString().split('T')[0];
      dailyRedemptions[date] = (dailyRedemptions[date] || 0) + 1;
    });

    const analytics = {
      overview: {
        totalViews: coupon.analytics.views,
        totalShares: coupon.analytics.shares,
        totalDownloads: coupon.analytics.downloads,
        totalRedemptions: coupon.usage.usedCount,
        remainingUses: coupon.usage.isUnlimited ? 'Unlimited' : coupon.usage.maxUses - coupon.usage.usedCount,
        redemptionRate: redemptionRate
      },
      redemptionTimeline,
      dailyRedemptions,
      status: coupon.status,
      daysRemaining: Math.max(0, Math.ceil((new Date(coupon.validity.endDate) - new Date()) / (1000 * 60 * 60 * 24)))
    };

    res.status(200).json({
      status: 'success',
      data: analytics
    });
  } catch (error) {
    console.error('Get coupon analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch coupon analytics'
    });
  }
};

// @desc    Validate coupon code
// @route   POST /api/coupons/validate
// @access  Public
exports.validateCoupon = async (req, res) => {
  try {
    const { code } = req.body;

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({
        status: 'error',
        message: 'Invalid coupon code',
        valid: false
      });
    }

    const isRedeemable = coupon.isRedeemable();

    res.status(200).json({
      status: 'success',
      valid: isRedeemable,
      data: isRedeemable ? {
        code: coupon.code,
        title: coupon.title,
        category: coupon.category,
        value: coupon.value,
        validUntil: coupon.validity.endDate,
        remainingUses: coupon.usage.isUnlimited ? 'Unlimited' : coupon.usage.maxUses - coupon.usage.usedCount
      } : null,
      message: isRedeemable ? 'Coupon is valid' : 'Coupon is invalid or expired'
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to validate coupon'
    });
  }
};

// @desc    Send coupon via WhatsApp, Email, SMS
// @route   POST /api/coupons/:id/send
// @access  Private/Admin
exports.sendCoupon = async (req, res) => {
  try {
    const { recipient, methods, partnerId } = req.body;
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        status: 'error',
        message: 'Coupon not found'
      });
    }

    // Try to find partner by email or phone if not provided
    let finalPartnerId = partnerId || coupon.partner;
    
    if (!finalPartnerId && recipient) {
      // Try to find partner by email
      if (recipient.email) {
        const partnerByEmail = await Partner.findOne({ 
          email: recipient.email.toLowerCase(),
          status: { $in: ['approved', 'active'] }
        });
        if (partnerByEmail) {
          finalPartnerId = partnerByEmail._id;
        }
      }
      
      // Try to find partner by phone if not found by email
      if (!finalPartnerId && recipient.phone) {
        const cleanPhone = recipient.phone.replace(/\D/g, ''); // Remove non-digits
        const partnerByPhone = await Partner.findOne({
          $or: [
            { phone: cleanPhone },
            { phone: recipient.phone }
          ],
          status: { $in: ['approved', 'active'] }
        });
        if (partnerByPhone) {
          finalPartnerId = partnerByPhone._id;
        }
      }
    }

    // Assign partner to coupon if found
    if (finalPartnerId) {
      coupon.partner = finalPartnerId;
      coupon.status = 'active'; // Activate coupon when partner is assigned
    }

    // Determine delivery methods
    const deliveryMethods = {
      email: methods?.email !== false && coupon.deliveryMethod?.email !== false,
      sms: methods?.sms !== false && coupon.deliveryMethod?.sms !== false,
      whatsapp: methods?.whatsapp !== false && coupon.deliveryMethod?.whatsapp !== false
    };

    // Send notifications
    const results = await sendCouponNotification(coupon, recipient, deliveryMethods);

    // Update coupon delivery method
    coupon.deliveryMethod = {
      whatsapp: deliveryMethods.whatsapp,
      email: deliveryMethods.email,
      sms: deliveryMethods.sms
    };
    
    // If coupon has a partner/vendor, automatically add to their wallet
    if (finalPartnerId) {
      try {
        const partner = await Partner.findById(finalPartnerId);
        if (partner) {
          // Find user by partner email or phone
          const User = require('../models/User');
          let vendorUser = null;
          
          // Try to find user by email
          if (partner.email) {
            vendorUser = await User.findOne({ 
              email: partner.email.toLowerCase(),
              role: { $in: ['partner', 'vendor'] }
            });
          }
          
          // Try to find user by phone if not found by email
          if (!vendorUser && partner.phone) {
            const cleanPhone = partner.phone.replace(/\D/g, '');
            vendorUser = await User.findOne({
              $or: [
                { phone: cleanPhone },
                { phone: partner.phone }
              ],
              role: { $in: ['partner', 'vendor'] }
            });
          }
          
          // If user found, add to wallet
          if (vendorUser) {
            let wallet = await Wallet.findOne({ vendor: vendorUser._id });
            
            if (!wallet) {
              // Create wallet if doesn't exist
              wallet = await Wallet.create({
                vendor: vendorUser._id,
                vendorType: coupon.category || 'other',
                status: 'active'
              });
            }
            
            // Add coupon to wallet
            const couponValue = getCouponMonetaryValue(coupon);
            await wallet.addCoupon(coupon._id, couponValue);
            
            // Add transaction for coupon received
            if (couponValue > 0) {
              await wallet.addTransaction({
                type: 'coupon_received',
                amount: couponValue,
                coupon: coupon._id,
                description: `Coupon ${coupon.code} received`,
                processedBy: req.user.id,
                status: 'completed'
              });
            }
          } else {
            console.log(`Partner ${partner.name} (${partner.email}) does not have a linked user account. Wallet not updated.`);
          }
        }
      } catch (walletError) {
        console.error('Error adding coupon to wallet:', walletError);
        // Don't fail the send operation if wallet update fails
      }
    }
    
    await coupon.save();

    res.json({
      status: 'success',
      message: 'Coupon sent successfully',
      data: results
    });
  } catch (error) {
    console.error('Send coupon error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to send coupon',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Add coupon to vendor wallet
// @route   POST /api/coupons/:id/add-to-wallet
// @access  Private/Admin
exports.addCouponToWallet = async (req, res) => {
  try {
    const { vendorId } = req.body;
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        status: 'error',
        message: 'Coupon not found'
      });
    }

    let wallet = await Wallet.findOne({ vendor: vendorId });
    if (!wallet) {
      // Create wallet if doesn't exist
      const vendor = await User.findById(vendorId);
      if (!vendor) {
        return res.status(404).json({
          status: 'error',
          message: 'Vendor not found'
        });
      }

      wallet = await Wallet.create({
        vendor: vendorId,
        vendorType: 'other',
        status: 'active'
      });
    }

    // Get coupon monetary value
    const couponValue = getCouponMonetaryValue(coupon);
    
    // Add coupon to wallet
    await wallet.addCoupon(coupon._id, couponValue);
    
    // Add transaction for coupon received
    if (couponValue > 0) {
      await wallet.addTransaction({
        type: 'coupon_received',
        amount: couponValue,
        coupon: coupon._id,
        description: `Coupon ${coupon.code} added to wallet`,
        processedBy: req.user.id,
        status: 'completed'
      });
    }

    res.json({
      status: 'success',
      message: 'Coupon added to vendor wallet',
      data: wallet
    });
  } catch (error) {
    console.error('Add coupon to wallet error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add coupon to wallet'
    });
  }
};

