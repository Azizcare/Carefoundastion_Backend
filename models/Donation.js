const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  beneficiary: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Beneficiary'
  },
  purpose: {
    type: String,
    maxlength: [500, 'Purpose cannot exceed 500 characters']
  },
  amount: {
    type: Number,
    required: [true, 'Donation amount is required'],
    min: [1, 'Minimum donation amount is ₹1']
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR']
  },
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: ['razorpay', 'stripe', 'upi', 'netbanking', 'card', 'wallet', 'test']
  },
  paymentDetails: {
    transactionId: {
      type: String,
      required: true
    },
    paymentId: String,
    orderId: String,
    gateway: {
      type: String,
      required: true
    },
    gatewayResponse: mongoose.Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  donorDetails: {
    name: String,
    email: String,
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: String
    }
  },
  receipt: {
    receiptNumber: {
      type: String,
      unique: true
    },
    generatedAt: Date,
    downloadUrl: String
  },
  taxBenefit: {
    isEligible: {
      type: Boolean,
      default: false
    },
    certificateUrl: String,
    generatedAt: Date
  },
  refund: {
    requestedAt: Date,
    processedAt: Date,
    amount: Number,
    reason: String,
    status: {
      type: String,
      enum: ['requested', 'approved', 'rejected', 'processed']
    }
  },
  fees: {
    platformFee: {
      type: Number,
      default: 0
    },
    paymentGatewayFee: {
      type: Number,
      default: 0
    },
    totalFees: {
      type: Number,
      default: 0
    }
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    referrer: String,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String
  },
  notifications: {
    receiptSent: {
      type: Boolean,
      default: false
    },
    thankYouSent: {
      type: Boolean,
      default: false
    },
    updateSent: {
      type: Boolean,
      default: false
    },
    utilizationUpdateSent: {
      type: Boolean,
      default: false
    },
    notificationMethods: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: true
      },
      whatsapp: {
        type: Boolean,
        default: false
      }
    }
  },
  transparency: {
    isAssignedToBeneficiary: {
      type: Boolean,
      default: false
    },
    assignedAmount: Number,
    assignedAt: Date,
    utilizationDetails: String
  }
}, {
  timestamps: true
});

// Indexes for better performance
donationSchema.index({ donor: 1 });
donationSchema.index({ campaign: 1 });
donationSchema.index({ status: 1 });
donationSchema.index({ 'paymentDetails.transactionId': 1 });
donationSchema.index({ createdAt: -1 });
donationSchema.index({ amount: 1 });

// Pre-save middleware to generate receipt number
donationSchema.pre('save', async function(next) {
  if (this.isNew && this.status === 'completed') {
    try {
      const count = await this.constructor.countDocuments();
      this.receipt.receiptNumber = `CF${Date.now()}${count.toString().padStart(4, '0')}`;
      this.receipt.generatedAt = new Date();
    } catch (error) {
      next(error);
    }
  }
  next();
});

// Method to calculate fees
donationSchema.methods.calculateFees = function() {
  // Platform fee: 2.5% of donation amount
  this.fees.platformFee = Math.round(this.amount * 0.025);
  
  // Payment gateway fee: 2% of donation amount
  this.fees.paymentGatewayFee = Math.round(this.amount * 0.02);
  
  // Total fees
  this.fees.totalFees = this.fees.platformFee + this.fees.paymentGatewayFee;
  
  return this.fees;
};

// Method to get net amount (amount after fees)
donationSchema.methods.getNetAmount = function() {
  return this.amount - this.fees.totalFees;
};

// Method to check if donation is eligible for tax benefit
donationSchema.methods.isEligibleForTaxBenefit = function() {
  // Only donations above ₹500 to verified campaigns are eligible
  return this.amount >= 500 && this.campaign.verification.isVerified;
};

// Static method to get donation statistics
donationSchema.statics.getStats = async function(filters = {}) {
  const pipeline = [
    { $match: { status: 'completed', ...filters } },
    {
      $group: {
        _id: null,
        totalDonations: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        avgAmount: { $avg: '$amount' },
        minAmount: { $min: '$amount' },
        maxAmount: { $max: '$amount' }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalDonations: 0,
    totalAmount: 0,
    avgAmount: 0,
    minAmount: 0,
    maxAmount: 0
  };
};

// Virtual for formatted amount
donationSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: this.currency
  }).format(this.amount);
});

module.exports = mongoose.model('Donation', donationSchema);






