const Wallet = require('../models/Wallet');
const User = require('../models/User');
const Coupon = require('../models/Coupon');

// @desc    Create wallet for vendor
// @route   POST /api/wallets
// @access  Private/Admin
exports.createWallet = async (req, res) => {
  try {
    const { vendor, vendorType, partnerId } = req.body;

    let finalVendorId = vendor;

    // If partnerId is provided, find or create user for that partner
    if (partnerId && !vendor) {
      const Partner = require('../models/Partner');
      const partner = await Partner.findById(partnerId);
      
      if (!partner) {
        return res.status(404).json({
          success: false,
          message: 'Partner not found'
        });
      }

      // Try to find existing user by email
      let vendorUser = await User.findOne({ 
        email: partner.email.toLowerCase(),
        role: { $in: ['partner', 'vendor'] }
      });

      // If user doesn't exist, create one
      if (!vendorUser) {
        // Generate a random password (user can reset it later)
        const crypto = require('crypto');
        const randomPassword = crypto.randomBytes(12).toString('hex');
        
        vendorUser = await User.create({
          name: partner.name,
          email: partner.email.toLowerCase(),
          phone: partner.phone,
          password: randomPassword, // Required field - random password
          role: 'partner',
          isVerified: partner.status === 'approved',
          isActive: partner.isActive !== false
        });
        console.log(`Created user account for partner: ${partner.name} with email: ${partner.email}`);
        console.log(`Temporary password generated. User should reset password on first login.`);
      }

      finalVendorId = vendorUser._id;
    }

    if (!finalVendorId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID or Partner ID is required'
      });
    }

    // Check if wallet already exists
    const existingWallet = await Wallet.findOne({ vendor: finalVendorId });
    if (existingWallet) {
      return res.status(400).json({
        success: false,
        message: 'Wallet already exists for this vendor'
      });
    }

    // Verify vendor user exists
    const vendorUserCheck = await User.findById(finalVendorId);
    if (!vendorUserCheck) {
      return res.status(404).json({
        success: false,
        message: 'Vendor user not found'
      });
    }

    const wallet = await Wallet.create({
      vendor: finalVendorId,
      vendorType: vendorType || 'other',
      status: 'active'
    });

    res.status(201).json({
      success: true,
      message: 'Wallet created successfully',
      data: wallet
    });
  } catch (error) {
    console.error('Create wallet error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to create wallet' 
    });
  }
};

// @desc    Get vendor wallet
// @route   GET /api/wallets/:vendorId
// @access  Private
exports.getWallet = async (req, res) => {
  try {
    const vendorId = req.params.vendorId || req.user.id;

    // Check if user is admin or wallet owner
    if (req.user.role !== 'admin' && req.user.id !== vendorId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this wallet'
      });
    }

    let wallet = await Wallet.findOne({ vendor: vendorId })
      .populate('vendor', 'name email phone')
      .populate('coupons.coupon', 'code title value');

    if (!wallet) {
      // Create wallet if doesn't exist
      const user = await User.findById(vendorId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      wallet = await Wallet.create({
        vendor: vendorId,
        vendorType: 'other',
        status: 'active'
      });
    }

    res.json({
      success: true,
      data: wallet
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Top-up wallet
// @route   POST /api/wallets/:vendorId/topup
// @access  Private/Admin
exports.topupWallet = async (req, res) => {
  try {
    const { amount, description } = req.body;
    const vendorId = req.params.vendorId;

    const wallet = await Wallet.findOne({ vendor: vendorId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    const transactionData = {
      type: 'topup',
      amount,
      description: description || 'Admin top-up',
      processedBy: req.user.id,
      status: 'completed'
    };

    await wallet.addTransaction(transactionData);

    res.json({
      success: true,
      message: 'Wallet topped up successfully',
      data: wallet
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Settle wallet payment
// @route   POST /api/wallets/:vendorId/settle
// @access  Private/Admin
exports.settleWallet = async (req, res) => {
  try {
    const { amount, transactionId } = req.body;
    const vendorId = req.params.vendorId;

    const wallet = await Wallet.findOne({ vendor: vendorId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    if (wallet.currentBalance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    const transactionData = {
      type: 'settlement',
      amount,
      transactionId,
      description: 'Payment settlement',
      processedBy: req.user.id,
      status: 'completed'
    };

    await wallet.addTransaction(transactionData);

    wallet.lastSettlement = {
      date: new Date(),
      amount,
      transactionId
    };

    await wallet.save();

    res.json({
      success: true,
      message: 'Payment settled successfully',
      data: wallet
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get wallet transactions
// @route   GET /api/wallets/:vendorId/transactions
// @access  Private
exports.getWalletTransactions = async (req, res) => {
  try {
    const vendorId = req.params.vendorId || req.user.id;

    if (req.user.role !== 'admin' && req.user.id !== vendorId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view these transactions'
      });
    }

    const wallet = await Wallet.findOne({ vendor: vendorId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    const transactions = wallet.transactions.sort((a, b) => b.processedAt - a.processedAt);

    res.json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all wallets (Admin only)
// @route   GET /api/wallets
// @access  Private/Admin
exports.getAllWallets = async (req, res) => {
  try {
    const { vendorType, status } = req.query;

    let query = {};
    if (vendorType) query.vendorType = vendorType;
    if (status) query.status = status;

    const wallets = await Wallet.find(query)
      .populate('vendor', 'name email phone role')
      .sort({ createdAt: -1 });

    console.log(`Found ${wallets.length} wallets in database`);

    res.status(200).json({
      success: true,
      status: 'success',
      count: wallets.length,
      data: wallets
    });
  } catch (error) {
    console.error('Get all wallets error:', error);
    res.status(500).json({ 
      success: false, 
      status: 'error',
      message: error.message 
    });
  }
};

