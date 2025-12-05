const mongoose = require('mongoose');

const formSubmissionSchema = new mongoose.Schema({
  formType: {
    type: String,
    required: [true, 'Form type is required'],
    enum: ['volunteer', 'beneficiary', 'donor', 'vendor', 'partner']
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'under_review'],
    default: 'pending'
  },
  // Common fields
  personalInfo: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say']
    },
    address: {
      type: mongoose.Schema.Types.Mixed, // Accept both string and object
      validate: {
        validator: function(v) {
          // Allow string or object with street, city, state, etc.
          return typeof v === 'string' || (typeof v === 'object' && v !== null);
        },
        message: 'Address must be a string or an object'
      }
    }
  },
  // Volunteer specific
  volunteerInfo: {
    fathersName: String,
    mothersName: String,
    academicQualification: String,
    professionalQualification: String,
    occupation: String,
    designation: String,
    hobbies: String,
    whyVolunteer: String,
    preferredRole: [String],
    availability: String,
    profileImage: String,
    identityProof: String
  },
  // Beneficiary specific
  beneficiaryInfo: {
    category: String,
    reason: String,
    requiredAmount: Number,
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    documents: [{
      type: String,
      url: String,
      publicId: String
    }]
  },
  // Vendor specific
  vendorInfo: {
    businessName: String,
    businessType: {
      type: String,
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
    gstNumber: String,
    licenseNumber: String,
    businessAddress: String,
    bankDetails: {
      accountNumber: String,
      ifsc: String,
      bankName: String,
      accountHolderName: String
    },
    documents: [{
      type: String,
      url: String,
      publicId: String
    }]
  },
  // Partner specific
  partnerInfo: {
    organizationName: String,
    organizationType: String,
    designation: String,
    partnershipType: String,
    description: String
  },
  // Admin actions
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  reviewNotes: String,
  assignedRole: {
    type: String,
    enum: ['donor', 'fundraiser', 'admin', 'partner', 'volunteer', 'vendor']
  },
  // Auto-generated profile after approval
  generatedProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
formSubmissionSchema.index({ formType: 1 });
formSubmissionSchema.index({ status: 1 });
formSubmissionSchema.index({ submittedBy: 1 });
formSubmissionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('FormSubmission', formSubmissionSchema);

