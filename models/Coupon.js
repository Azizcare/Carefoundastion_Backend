const mongoose = require('mongoose');

const COUPON_STAGES = [
  'CREATED',
  'ASSIGNED',
  'REDEEMED_PENDING_SETTLEMENT',
  'SETTLED',
  'EXPIRED',
  'CANCELLED',
  'REJECTED'
];

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  title: {
    type: String,
    required: [true, 'Coupon title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Coupon description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'food_server',
      'restaurant',
      'food_grain_supplier',
      'pathology_lab',
      'hospital',
      'milk_bread_vendor',
      'food',
      'medical',
      'education',
      'transport',
      'clothing',
      'other'
    ]
  },
  type: {
    type: String,
    required: [true, 'Coupon type is required'],
    enum: ['discount', 'cashback', 'free_item', 'service']
  },
  value: {
    amount: {
      type: mongoose.Schema.Types.Mixed, // Mixed to allow both Number and String
      required: false,
      validate: {
        validator: function(value) {
          // If value is undefined/null, it's okay (percentage might be used instead)
          if (value === undefined || value === null) {
            return true;
          }
          // For free_item and service, amount is a string description
          if (this.type === 'free_item' || this.type === 'service') {
            return typeof value === 'string' && value.trim().length > 0;
          }
          // For discount/cashback, amount should be a number >= 1
          return typeof value === 'number' && value >= 1;
        },
        message: 'Amount must be a number >= 1 for discount/cashback, or a non-empty string for free_item/service'
      }
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR']
    },
    percentage: {
      type: Number,
      min: [1, 'Percentage must be between 1-100'],
      max: [100, 'Percentage must be between 1-100']
    },
    isPercentage: {
      type: Boolean,
      default: false
    }
  },
  issuer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  partner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner'
  },
  beneficiary: {
    name: String,
    email: String,
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String
    }
  },
  validity: {
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  usage: {
    maxUses: {
      type: Number,
      default: 1,
      min: [1, 'Maximum uses must be at least 1']
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0
    },
    isUnlimited: {
      type: Boolean,
      default: false
    }
  },
  conditions: {
    minAmount: {
      type: Number,
      default: 0
    },
    maxAmount: {
      type: Number
    },
    applicableItems: [String],
    excludedItems: [String],
    userRestrictions: {
      newUsersOnly: {
        type: Boolean,
        default: false
      },
      minDonationAmount: {
        type: Number,
        default: 0
      },
      maxUsesPerUser: {
        type: Number,
        default: 1
      }
    }
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'inactive', 'expired', 'exhausted', 'cancelled', 'redeemed'],
    default: 'pending'
  },
  deliveryMethod: {
    whatsapp: {
      type: Boolean,
      default: false
    },
    email: {
      type: Boolean,
      default: false
    },
    sms: {
      type: Boolean,
      default: false
    }
  },
  redemptions: [{
    redeemedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    redeemedAt: {
      type: Date,
      default: Date.now
    },
    amount: Number,
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Partner'
    },
    location: {
      name: String,
      address: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    notes: String,
    receipt: String
  }],
  fraudPrevention: {
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationMethod: {
      type: String,
      enum: ['otp', 'id_verification', 'location_based', 'manual']
    },
    maxRedemptionsPerDay: {
      type: Number,
      default: 1
    },
    suspiciousActivity: [{
      type: String,
      description: String,
      detectedAt: Date,
      resolved: {
        type: Boolean,
        default: false
      }
    }]
  },
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    downloads: {
      type: Number,
      default: 0
    },
    redemptionRate: {
      type: Number,
      default: 0
    }
  },
  qrCode: {
    url: String,
    data: String
  },
  terms: {
    type: String,
    maxlength: [1000, 'Terms cannot exceed 1000 characters']
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  tags: [String],
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  packageId: String,
  packageTitle: String,
  packageDescription: String,
  packageAmount: Number,
  packageCategory: String,
  packageValidityDays: Number,
  donation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donation'
  },
  stage: {
    type: String,
    enum: COUPON_STAGES,
    default: 'CREATED'
  },
  stageHistory: [{
    stage: {
      type: String,
      enum: COUPON_STAGES
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String
  }],
  beneficiaryName: String,
  beneficiaryPhone: String,
  assignedAt: Date,
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  settledAt: Date,
  settlement: {
    payableAmount: Number,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    referenceNo: String,
    paidOn: Date
  },
  paymentReferences: {
    transactionId: String,
    gatewayId: String,
    gateway: String
  },
  rejectionReason: String,
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  }
}, {
  timestamps: true
});

// Indexes for better performance
couponSchema.index({ code: 1 });
couponSchema.index({ issuer: 1 });
couponSchema.index({ campaign: 1 });
couponSchema.index({ category: 1 });
couponSchema.index({ status: 1 });
couponSchema.index({ 'validity.endDate': 1 });
couponSchema.index({ isPublic: 1, status: 1 });

// Pre-save middleware to generate coupon code if not provided
couponSchema.pre('save', async function(next) {
  if (!this.code) {
    try {
      const prefix = this.category.toUpperCase().substring(0, 3);
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      this.code = `${prefix}${timestamp}${random}`;
    } catch (error) {
      next(error);
    }
  }
  next();
});

// Virtual for remaining uses
couponSchema.virtual('remainingUses').get(function() {
  if (this.usage.isUnlimited) return 'Unlimited';
  return Math.max(0, this.usage.maxUses - this.usage.usedCount);
});

// Virtual for isExpired
couponSchema.virtual('isExpired').get(function() {
  return new Date() > this.validity.endDate;
});

// Pre-save validation: ensure either amount or percentage is provided for discount/cashback
couponSchema.pre('save', function(next) {
  if (this.type === 'discount' || this.type === 'cashback') {
    const hasAmount = this.value.amount !== undefined && this.value.amount !== null;
    const hasPercentage = this.value.percentage !== undefined && this.value.percentage !== null;
    
    if (!hasAmount && !hasPercentage) {
      return next(new Error('Either amount or percentage must be provided for discount/cashback coupons'));
    }
  } else if (this.type === 'free_item' || this.type === 'service') {
    if (!this.value.amount || (typeof this.value.amount === 'string' && this.value.amount.trim().length === 0)) {
      return next(new Error('Description is required for free_item and service coupons'));
    }
  }
  next();
});

// Ensure there is always at least one stage history entry
couponSchema.pre('save', function(next) {
  if (!this.stageHistory || this.stageHistory.length === 0) {
    this.stageHistory = [{
      stage: this.stage || 'CREATED',
      changedAt: new Date(),
      changedBy: this.issuer,
      notes: 'Initial stage'
    }];
  }
  next();
});

// Virtual for isExhausted
couponSchema.virtual('isExhausted').get(function() {
  return !this.usage.isUnlimited && this.usage.usedCount >= this.usage.maxUses;
});

// Virtual for daysRemaining
couponSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const endDate = new Date(this.validity.endDate);
  const diffTime = endDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
});

// Method to check if coupon is redeemable
couponSchema.methods.isRedeemable = function() {
  const now = new Date();
  const redeemableStages = ['CREATED', 'ASSIGNED'];
  return this.status === 'active' &&
         redeemableStages.includes(this.stage) &&
         this.validity.isActive &&
         now >= this.validity.startDate &&
         now <= this.validity.endDate &&
         !this.isExhausted &&
         this.fraudPrevention.isVerified;
};

// Method to record stage transitions
couponSchema.methods.recordStageChange = function(newStage, userId, notes = '') {
  if (!newStage) return this;
  const uppercaseStage = newStage.toUpperCase();
  if (!COUPON_STAGES.includes(uppercaseStage)) {
    throw new Error(`Invalid coupon stage: ${uppercaseStage}`);
  }
  if (this.stage === uppercaseStage) {
    return this;
  }
  this.stage = uppercaseStage;
  this.stageHistory = this.stageHistory || [];
  this.stageHistory.push({
    stage: uppercaseStage,
    changedAt: new Date(),
    changedBy: userId,
    notes
  });
  return this;
};

// Method to redeem coupon
couponSchema.methods.redeem = function(redemptionData) {
  if (!this.isRedeemable()) {
    throw new Error('Coupon is not redeemable');
  }
  
  this.redemptions.push(redemptionData);
  this.usage.usedCount += 1;
  this.redeemedAt = redemptionData.redeemedAt || new Date();
  
  // Update stage to redemption pending settlement
  this.recordStageChange('REDEEMED_PENDING_SETTLEMENT', redemptionData.redeemedBy, 'Partner redeemed coupon');

  // Update status if exhausted
  if (!this.usage.isUnlimited && this.usage.usedCount >= this.usage.maxUses) {
    this.status = 'exhausted';
  }
  
  return this.save();
};

// Method to update analytics
couponSchema.methods.updateAnalytics = function(type, increment = 1) {
  if (this.analytics[type] !== undefined) {
    this.analytics[type] += increment;
  }
  return this.save();
};

// Static method to generate unique coupon code
couponSchema.statics.generateUniqueCode = async function(prefix = 'CF') {
  let code;
  let isUnique = false;
  
  while (!isUnique) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    code = `${prefix}${timestamp}${random}`;
    
    const existing = await this.findOne({ code });
    isUnique = !existing;
  }
  
  return code;
};

module.exports = mongoose.model('Coupon', couponSchema);






