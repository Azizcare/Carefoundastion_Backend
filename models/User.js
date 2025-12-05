const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
  },
  role: {
    type: String,
    enum: ['donor', 'fundraiser', 'admin', 'partner', 'volunteer', 'vendor', 'staff'],
    default: 'donor'
  },
  // Granular permissions for role-based access
  permissions: {
    campaigns: {
      view: { type: Boolean, default: true },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      approve: { type: Boolean, default: false }
    },
    donations: {
      view: { type: Boolean, default: true },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    coupons: {
      view: { type: Boolean, default: true },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      send: { type: Boolean, default: false }
    },
    users: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    volunteers: {
      view: { type: Boolean, default: true },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    forms: {
      view: { type: Boolean, default: true },
      approve: { type: Boolean, default: false },
      reject: { type: Boolean, default: false },
      edit: { type: Boolean, default: false }
    },
    reports: {
      view: { type: Boolean, default: false },
      download: { type: Boolean, default: false }
    },
    wallets: {
      view: { type: Boolean, default: false },
      topup: { type: Boolean, default: false },
      settle: { type: Boolean, default: false }
    }
  },
  // Two-Factor Authentication
  twoFactorAuth: {
    enabled: {
      type: Boolean,
      default: false
    },
    secret: {
      type: String,
      select: false
    },
    backupCodes: [{
      type: String,
      select: false
    }],
    verifiedAt: Date
  },
  avatar: {
    type: String,
    default: ''
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  otp: {
    type: String,
    select: false
  },
  otpExpiry: {
    type: Date,
    select: false
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
  kyc: {
    isCompleted: {
      type: Boolean,
      default: false
    },
    documents: [{
      type: {
        type: String,
        enum: ['aadhar', 'pan', 'passport', 'driving_license']
      },
      number: String,
      file: String,
      verified: {
        type: Boolean,
        default: false
      }
    }]
  },
  preferences: {
    notifications: {
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
      },
      push: {
        type: Boolean,
        default: true
      },
      donationUpdates: {
        type: Boolean,
        default: true
      },
      couponUpdates: {
        type: Boolean,
        default: true
      },
      eventReminders: {
        type: Boolean,
        default: true
      }
    },
    privacy: {
      showProfile: {
        type: Boolean,
        default: true
      },
      showDonations: {
        type: Boolean,
        default: false
      }
    }
  },
  socialLinks: {
    facebook: String,
    twitter: String,
    instagram: String,
    linkedin: String
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  verificationToken: String,
  verificationExpire: Date,
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  referralStats: {
    totalReferrals: {
      type: Number,
      default: 0
    },
    totalReferralDonations: {
      type: Number,
      default: 0
    },
    referralRewards: {
      type: Number,
      default: 0
    }
  },
  volunteerDetails: {
    fathersName: String,
    mothersName: String,
    dateOfBirth: Date,
    academicQualification: String,
    professionalQualification: String,
    nationality: String,
    communicationAddress: String,
    permanentAddress: String,
    occupation: String,
    designation: String,
    hobbies: String,
    whyVolunteer: String,
    profileImage: String,
    identityProof: String
  }
}, {
  timestamps: true
});

// Index for better performance
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ role: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get public profile
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.resetPasswordToken;
  delete userObject.resetPasswordExpire;
  delete userObject.verificationToken;
  delete userObject.verificationExpire;
  // Safely delete twoFactorAuth secrets if they exist
  if (userObject.twoFactorAuth) {
    delete userObject.twoFactorAuth.secret;
    delete userObject.twoFactorAuth.backupCodes;
  }
  return userObject;
};

// Generate unique referral code
userSchema.methods.generateReferralCode = function() {
  const prefix = this.name.substring(0, 3).toUpperCase().replace(/\s/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}${random}`;
};

// Set default permissions based on role
userSchema.methods.setDefaultPermissions = function() {
  const rolePermissions = {
    admin: {
      campaigns: { view: true, create: true, edit: true, delete: true, approve: true },
      donations: { view: true, create: true, edit: true, delete: true },
      coupons: { view: true, create: true, edit: true, delete: true, send: true },
      users: { view: true, create: true, edit: true, delete: true },
      volunteers: { view: true, create: true, edit: true, delete: true },
      forms: { view: true, approve: true, reject: true, edit: true },
      reports: { view: true, download: true },
      wallets: { view: true, topup: true, settle: true }
    },
    staff: {
      campaigns: { view: true, create: true, edit: true, delete: false, approve: true },
      donations: { view: true, create: false, edit: true, delete: false },
      coupons: { view: true, create: true, edit: true, delete: false, send: true },
      users: { view: true, create: false, edit: true, delete: false },
      volunteers: { view: true, create: true, edit: true, delete: false },
      forms: { view: true, approve: true, reject: true, edit: true },
      reports: { view: true, download: true },
      wallets: { view: true, topup: true, settle: true }
    },
    volunteer: {
      campaigns: { view: true, create: false, edit: false, delete: false, approve: false },
      donations: { view: true, create: true, edit: false, delete: false },
      coupons: { view: true, create: false, edit: false, delete: false, send: false },
      users: { view: false, create: false, edit: false, delete: false },
      volunteers: { view: true, create: false, edit: false, delete: false },
      forms: { view: true, approve: false, reject: false, edit: false },
      reports: { view: false, download: false },
      wallets: { view: false, topup: false, settle: false }
    },
    partner: {
      campaigns: { view: true, create: false, edit: false, delete: false, approve: false },
      donations: { view: true, create: false, edit: false, delete: false },
      coupons: { view: true, create: false, edit: false, delete: false, send: false },
      users: { view: false, create: false, edit: false, delete: false },
      volunteers: { view: true, create: false, edit: false, delete: false },
      forms: { view: true, approve: false, reject: false, edit: false },
      reports: { view: false, download: false },
      wallets: { view: true, topup: false, settle: false }
    },
    fundraiser: {
      campaigns: { view: true, create: true, edit: true, delete: false, approve: false },
      donations: { view: true, create: false, edit: false, delete: false },
      coupons: { view: true, create: true, edit: true, delete: false, send: true },
      users: { view: false, create: false, edit: false, delete: false },
      volunteers: { view: true, create: false, edit: false, delete: false },
      forms: { view: true, approve: false, reject: false, edit: false },
      reports: { view: true, download: true },
      wallets: { view: false, topup: false, settle: false }
    },
    donor: {
      campaigns: { view: true, create: false, edit: false, delete: false, approve: false },
      donations: { view: true, create: true, edit: false, delete: false },
      coupons: { view: true, create: false, edit: false, delete: false, send: false },
      users: { view: false, create: false, edit: false, delete: false },
      volunteers: { view: true, create: false, edit: false, delete: false },
      forms: { view: true, approve: false, reject: false, edit: false },
      reports: { view: true, download: true },
      wallets: { view: false, topup: false, settle: false }
    },
    vendor: {
      campaigns: { view: true, create: false, edit: false, delete: false, approve: false },
      donations: { view: true, create: false, edit: false, delete: false },
      coupons: { view: true, create: false, edit: false, delete: false, send: false },
      users: { view: false, create: false, edit: false, delete: false },
      volunteers: { view: true, create: false, edit: false, delete: false },
      forms: { view: true, approve: false, reject: false, edit: false },
      reports: { view: true, download: true },
      wallets: { view: true, topup: false, settle: false }
    }
  };

  if (rolePermissions[this.role]) {
    this.permissions = rolePermissions[this.role];
  }
};

// Auto-generate referral code before save if not exists
userSchema.pre('save', async function(next) {
  // Generate referral code if doesn't exist
  if (!this.referralCode && this.role !== 'admin' && this.isNew) {
    let code;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      code = this.generateReferralCode();
      const UserModel = mongoose.model('User');
      const existing = await UserModel.findOne({ referralCode: code });
      if (!existing) {
        isUnique = true;
        this.referralCode = code;
      }
      attempts++;
    }
    
    if (!isUnique) {
      // Fallback: use timestamp-based code
      this.referralCode = `REF${Date.now().toString().slice(-8).toUpperCase()}`;
    }
  }
  
  // Set default permissions if not set
  if (!this.permissions || Object.keys(this.permissions).length === 0 || this.isNew) {
    this.setDefaultPermissions();
  }
  
  next();
});

module.exports = mongoose.model('User', userSchema);






