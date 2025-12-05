const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  amount: {
    type: Number,
    required: [true, 'Withdrawal amount is required'],
    min: [100, 'Minimum withdrawal amount is ₹100']
  },
  accountDetails: {
    accountHolderName: {
      type: String,
      required: [true, 'Account holder name is required']
    },
    accountNumber: {
      type: String,
      required: [true, 'Account number is required']
    },
    ifscCode: {
      type: String,
      required: [true, 'IFSC code is required']
    },
    bankName: String,
    branchName: String,
    accountType: {
      type: String,
      enum: ['savings', 'current'],
      default: 'savings'
    },
    upiId: String
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled'],
    default: 'pending'
  },
  transactionDetails: {
    transactionId: String,
    transactionDate: Date,
    utrNumber: String,
    gateway: String
  },
  fees: {
    platformFee: {
      type: Number,
      default: 0
    },
    processingFee: {
      type: Number,
      default: 0
    },
    tds: {
      type: Number,
      default: 0
    },
    totalFees: {
      type: Number,
      default: 0
    },
    netAmount: {
      type: Number,
      default: 0
    }
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: Date,
  approvedAt: Date,
  rejectedAt: Date,
  rejectionReason: String,
  adminNotes: String,
  supportingDocuments: [{
    name: String,
    url: String,
    type: String
  }],
  metadata: {
    ipAddress: String,
    userAgent: String
  }
}, {
  timestamps: true
});

// Indexes
withdrawalSchema.index({ user: 1 });
withdrawalSchema.index({ campaign: 1 });
withdrawalSchema.index({ status: 1 });
withdrawalSchema.index({ createdAt: -1 });

// Pre-save middleware to calculate fees
withdrawalSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('amount')) {
    // Platform fee: 2% of withdrawal amount
    this.fees.platformFee = Math.round(this.amount * 0.02);
    
    // Processing fee: ₹50 flat
    this.fees.processingFee = 50;
    
    // TDS: 1% (Tax Deducted at Source)
    this.fees.tds = Math.round(this.amount * 0.01);
    
    // Total fees
    this.fees.totalFees = this.fees.platformFee + this.fees.processingFee + this.fees.tds;
    
    // Net amount (amount user will receive)
    this.fees.netAmount = this.amount - this.fees.totalFees;
  }
  next();
});

// Method to approve withdrawal
withdrawalSchema.methods.approve = async function(adminId) {
  this.status = 'approved';
  this.approvedAt = new Date();
  this.processedBy = adminId;
  return this.save();
};

// Method to reject withdrawal
withdrawalSchema.methods.reject = async function(adminId, reason) {
  this.status = 'rejected';
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  this.processedBy = adminId;
  return this.save();
};

// Method to complete withdrawal
withdrawalSchema.methods.complete = async function(transactionDetails) {
  this.status = 'completed';
  this.processedAt = new Date();
  this.transactionDetails = transactionDetails;
  return this.save();
};

// Virtual for formatted amount
withdrawalSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(this.amount);
});

// Virtual for formatted net amount
withdrawalSchema.virtual('formattedNetAmount').get(function() {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(this.fees.netAmount);
});

module.exports = mongoose.model('Withdrawal', withdrawalSchema);













