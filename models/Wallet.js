const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Vendor is required'],
    unique: true
  },
  vendorType: {
    type: String,
    required: true,
    enum: [
      'food_server',
      'restaurant',
      'food_grain_supplier',
      'pathology_lab',
      'hospital',
      'milk_bread_vendor',
      'other'
    ]
  },
  currentBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  totalReceived: {
    type: Number,
    default: 0
  },
  totalRedeemed: {
    type: Number,
    default: 0
  },
  totalSettled: {
    type: Number,
    default: 0
  },
  transactions: [{
    type: {
      type: String,
      enum: ['topup', 'coupon_received', 'coupon_redeemed', 'settlement', 'adjustment'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon'
    },
    description: String,
    transactionId: String,
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    processedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      default: 'completed'
    }
  }],
  coupons: [{
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon'
    },
    receivedAt: {
      type: Date,
      default: Date.now
    },
    redeemedAt: Date,
    redeemedAmount: Number,
    status: {
      type: String,
      enum: ['pending', 'redeemed', 'expired', 'cancelled'],
      default: 'pending'
    }
  }],
  status: {
    type: String,
    enum: ['active', 'suspended', 'closed'],
    default: 'active'
  },
  lastSettlement: {
    date: Date,
    amount: Number,
    transactionId: String
  },
  settings: {
    autoSettlement: {
      type: Boolean,
      default: false
    },
    settlementThreshold: {
      type: Number,
      default: 10000 // Auto-settle when balance reaches ₹10,000
    },
    notificationEnabled: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Indexes
walletSchema.index({ vendor: 1 });
walletSchema.index({ vendorType: 1 });
walletSchema.index({ status: 1 });

// Method to add transaction
walletSchema.methods.addTransaction = function(transactionData) {
  this.transactions.push(transactionData);
  
  if (transactionData.type === 'topup' || transactionData.type === 'coupon_received') {
    this.currentBalance += transactionData.amount;
    this.totalReceived += transactionData.amount;
  } else if (transactionData.type === 'coupon_redeemed' || transactionData.type === 'settlement') {
    this.currentBalance -= transactionData.amount;
    if (transactionData.type === 'coupon_redeemed') {
      this.totalRedeemed += transactionData.amount;
    } else {
      this.totalSettled += transactionData.amount;
    }
  }
  
  return this.save();
};

// Method to add coupon
walletSchema.methods.addCoupon = function(couponId, amount = 0) {
  this.coupons.push({
    coupon: couponId,
    receivedAt: new Date(),
    redeemedAmount: amount, // For percentage coupons, this will be 0 until redemption
    status: 'pending'
  });
  return this.save();
};

// Method to redeem coupon
walletSchema.methods.redeemCoupon = function(couponId, amount) {
  const couponEntry = this.coupons.find(c => c.coupon.toString() === couponId.toString() && c.status === 'pending');
  if (!couponEntry) {
    throw new Error('Coupon not found or already redeemed');
  }
  
  couponEntry.redeemedAt = new Date();
  const previousAmount = couponEntry.redeemedAmount || 0;
  couponEntry.redeemedAmount = amount;
  couponEntry.status = 'redeemed';
  
  // Update totals - always add to totalRedeemed
  this.totalRedeemed += amount;
  
  // Update balance logic:
  // - If coupon was in balance (previousAmount > 0), subtract the redeemed amount
  // - If coupon was not in balance (previousAmount = 0, percentage coupon), 
  //   don't subtract from balance (will be settled separately by admin)
  if (previousAmount > 0) {
    // Amount-based coupon: subtract from balance
    this.currentBalance -= amount;
  }
  // For percentage coupons (previousAmount = 0), balance remains unchanged
  // Admin will settle these via settlement transaction
  
  return this.save();
};

module.exports = mongoose.model('Wallet', walletSchema);

