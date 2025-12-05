const mongoose = require('mongoose');

const volunteerCardSchema = new mongoose.Schema({
  volunteer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Volunteer is required']
  },
  cardNumber: {
    type: String,
    required: false, // Will be auto-generated in pre-save hook
    unique: true,
    sparse: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  photo: {
    url: {
      type: String,
      required: [true, 'Photo is required']
    },
    publicId: String
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: [
      'doctor_volunteer',
      'nurse_paramedic',
      'hospital_partner',
      'pathology_lab_partner',
      'food_supplier_kitchen_partner',
      'food_server_delivery_volunteer',
      'donor_volunteer',
      'media_social_partner',
      'student_volunteer',
      'event_organizer_helper',
      'technical_it_volunteer',
      'executive_core_team_member'
    ]
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Doctor Volunteer',
      'Nurse / Paramedic',
      'Hospital Partner',
      'Pathology / Lab Partner',
      'Food Supplier / Kitchen Partner',
      'Food Server / Delivery Volunteer',
      'Donor Volunteer',
      'Media / Social Partner',
      'Student Volunteer',
      'Event Organizer / Helper',
      'Technical / IT Volunteer',
      'Executive / Core Team Member'
    ]
  },
  validityDate: {
    type: Date,
    required: [true, 'Validity date is required']
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
  status: {
    type: String,
    enum: ['active', 'revoked', 'expired', 'pending'],
    default: 'pending'
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
volunteerCardSchema.index({ cardNumber: 1 });
volunteerCardSchema.index({ volunteer: 1 });
volunteerCardSchema.index({ status: 1 });
volunteerCardSchema.index({ role: 1 });
volunteerCardSchema.index({ verificationToken: 1 });

// Pre-save middleware to generate card number
volunteerCardSchema.pre('save', async function(next) {
  // Always generate cardNumber if not set (for new documents)
  if (!this.cardNumber || this.isNew) {
    try {
      const prefix = 'CFV';
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      this.cardNumber = `${prefix}${timestamp}${random}`;
      
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
volunteerCardSchema.virtual('verificationLink').get(function() {
  return `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-volunteer/${this.verificationToken}`;
});

// Method to check if card is valid
volunteerCardSchema.methods.isValid = function() {
  const now = new Date();
  return this.status === 'active' && 
         now <= new Date(this.validityDate);
};

module.exports = mongoose.model('VolunteerCard', volunteerCardSchema);

