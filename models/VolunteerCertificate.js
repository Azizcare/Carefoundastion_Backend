const mongoose = require('mongoose');

const volunteerCertificateSchema = new mongoose.Schema({
  volunteer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Volunteer is required']
  },
  certificateNumber: {
    type: String,
    required: false, // Will be auto-generated in pre-save hook
    unique: true,
    trim: true
  },
  purpose: {
    type: String,
    required: [true, 'Certificate purpose is required'],
    trim: true,
    maxlength: [500, 'Purpose cannot exceed 500 characters']
  },
  title: {
    type: String,
    required: [true, 'Certificate title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  issuedAt: {
    type: Date,
    default: Date.now
  },
  qrCode: {
    url: String,
    data: String,
    verificationLink: String
  },
  digitalSignature: {
    ceoSignature: {
      type: String,
      default: 'Aziz Gheewala - CEO, Care Foundation Trust®️'
    },
    signatureImage: String
  },
  program: {
    type: String,
    enum: [
      'service_appreciation',
      'food_relief_program',
      'medical_assistance',
      'event_participation',
      'leadership_role',
      'long_term_service',
      'special_contribution',
      'other'
    ]
  },
  pdfUrl: String,
  isPublic: {
    type: Boolean,
    default: true
  },
  verificationToken: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true
});

// Indexes
volunteerCertificateSchema.index({ certificateNumber: 1 });
volunteerCertificateSchema.index({ volunteer: 1 });
volunteerCertificateSchema.index({ verificationToken: 1 });

// Pre-save middleware to generate certificate number
volunteerCertificateSchema.pre('save', async function(next) {
  // Always generate certificateNumber if not set (for new documents)
  if (!this.certificateNumber || this.isNew) {
    try {
      const prefix = 'CFC';
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      this.certificateNumber = `${prefix}${timestamp}${random}`;
      
      // Generate verification token if not set
      if (!this.verificationToken) {
        this.verificationToken = new mongoose.Types.ObjectId().toString();
      }
    } catch (error) {
      console.error('Pre-save hook error:', error);
      return next(error);
    }
  }
  next();
});

// Virtual for verification link
volunteerCertificateSchema.virtual('verificationLink').get(function() {
  return `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-certificate/${this.verificationToken}`;
});

module.exports = mongoose.model('VolunteerCertificate', volunteerCertificateSchema);

