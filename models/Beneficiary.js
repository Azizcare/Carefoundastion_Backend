const mongoose = require('mongoose');

const beneficiarySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Beneficiary name is required'],
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: {
      type: String,
      default: 'India'
    }
  },
  category: {
    type: String,
    required: true,
    enum: [
      'medical',
      'education',
      'food',
      'housing',
      'disaster_relief',
      'elderly_care',
      'child_care',
      'other'
    ]
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'active', 'completed', 'suspended'],
    default: 'pending'
  },
  assignedAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  receivedAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  donations: [{
    donation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation'
    },
    amount: Number,
    assignedAt: Date,
    status: {
      type: String,
      enum: ['assigned', 'transferred', 'utilized'],
      default: 'assigned'
    }
  }],
  documents: [{
    type: {
      type: String,
      enum: ['id_proof', 'medical_report', 'income_certificate', 'other']
    },
    url: String,
    publicId: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  verification: {
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: Date,
    verificationNotes: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String
}, {
  timestamps: true
});

// Indexes
beneficiarySchema.index({ status: 1 });
beneficiarySchema.index({ category: 1 });
beneficiarySchema.index({ phone: 1 });
beneficiarySchema.index({ 'verification.isVerified': 1 });

module.exports = mongoose.model('Beneficiary', beneficiarySchema);

