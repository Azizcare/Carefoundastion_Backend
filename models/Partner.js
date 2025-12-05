const mongoose = require('mongoose');

const partnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Partner name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
  },
  businessType: {
    type: String,
    required: [true, 'Business type is required'],
    enum: ['restaurant', 'hospital', 'clinic', 'pharmacy', 'school', 'college', 'ngo', 'retail', 'service', 'other']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['food', 'medical', 'education', 'transport', 'clothing', 'other']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required']
    },
    city: {
      type: String,
      required: [true, 'City is required']
    },
    state: {
      type: String,
      required: [true, 'State is required']
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode']
    },
    country: {
      type: String,
      default: 'India'
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  contactPerson: {
    name: {
      type: String,
      required: [true, 'Contact person name is required']
    },
    designation: String,
    phone: String,
    email: String
  },
  documents: {
    businessLicense: {
      type: String,
      required: [true, 'Business license is required']
    },
    gstNumber: String,
    panNumber: String,
    bankDetails: {
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      accountHolderName: String
    }
  },
  services: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    price: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  operatingHours: {
    monday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    tuesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    wednesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    thursday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    friday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    saturday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    sunday: { open: String, close: String, isOpen: { type: Boolean, default: false } }
  },
  images: [{
    url: String,
    caption: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  socialLinks: {
    website: String,
    facebook: String,
    instagram: String,
    twitter: String,
    linkedin: String
  },
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
    verificationNotes: String,
    documents: [{
      type: {
        type: String,
        enum: ['license', 'gst', 'pan', 'bank', 'other']
      },
      url: String,
      verified: {
        type: Boolean,
        default: false
      }
    }]
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended', 'active'],
    default: 'pending'
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    },
    reviews: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
      },
      comment: String,
      date: {
        type: Date,
        default: Date.now
      }
    }]
  },
  analytics: {
    totalRedemptions: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    monthlyRedemptions: [{
      month: String,
      year: Number,
      count: Number,
      revenue: Number
    }],
    popularServices: [{
      serviceId: mongoose.Schema.Types.ObjectId,
      name: String,
      redemptions: Number
    }]
  },
  commission: {
    rate: {
      type: Number,
      default: 5, // 5% commission
      min: 0,
      max: 50
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  adminNotes: String,
  rejectionReason: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for better performance
partnerSchema.index({ email: 1 });
partnerSchema.index({ phone: 1 });
partnerSchema.index({ category: 1 });
partnerSchema.index({ businessType: 1 });
partnerSchema.index({ status: 1 });
partnerSchema.index({ 'address.city': 1, 'address.state': 1 });
partnerSchema.index({ 'verification.isVerified': 1, status: 1 });

// Method to update rating
partnerSchema.methods.updateRating = function() {
  if (this.rating.reviews.length > 0) {
    const totalRating = this.rating.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.rating.average = Math.round((totalRating / this.rating.reviews.length) * 10) / 10;
    this.rating.count = this.rating.reviews.length;
  }
  return this.save();
};

// Method to add review
partnerSchema.methods.addReview = function(reviewData) {
  this.rating.reviews.push(reviewData);
  return this.updateRating();
};

// Method to check if partner is open
partnerSchema.methods.isOpen = function() {
  const now = new Date();
  const day = now.toLocaleLowerCase().substring(0, 3);
  const currentTime = now.toTimeString().substring(0, 5);
  
  const daySchedule = this.operatingHours[day];
  if (!daySchedule || !daySchedule.isOpen) return false;
  
  return currentTime >= daySchedule.open && currentTime <= daySchedule.close;
};

// Method to get nearby partners
partnerSchema.statics.getNearby = function(latitude, longitude, radius = 10, category = null) {
  const query = {
    status: 'active',
    'verification.isVerified': true,
    isActive: true
  };
  
  if (category) {
    query.category = category;
  }
  
  return this.find(query).where('address.coordinates').near({
    center: { type: 'Point', coordinates: [longitude, latitude] },
    maxDistance: radius * 1000, // Convert km to meters
    spherical: true
  });
};

// Virtual for full address
partnerSchema.virtual('fullAddress').get(function() {
  return `${this.address.street}, ${this.address.city}, ${this.address.state} ${this.address.pincode}, ${this.address.country}`;
});

// Virtual for isVerified
partnerSchema.virtual('isVerified').get(function() {
  return this.verification.isVerified && this.status === 'active';
});

module.exports = mongoose.model('Partner', partnerSchema);






