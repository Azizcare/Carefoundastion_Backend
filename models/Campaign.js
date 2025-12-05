const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Campaign title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Campaign description is required'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  shortDescription: {
    type: String,
    required: [true, 'Short description is required'],
    maxlength: [200, 'Short description cannot exceed 200 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['medical', 'education', 'disaster', 'animal', 'environment', 'sports', 'technology', 'other']
  },
  subcategory: {
    type: String,
    trim: true
  },
  goalAmount: {
    type: Number,
    required: [true, 'Goal amount is required'],
    min: [100, 'Minimum goal amount is ₹100']
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR']
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    publicId: String,
    caption: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  videos: [{
    url: String,
    thumbnail: String,
    caption: String,
    platform: {
      type: String,
      enum: ['youtube', 'uploaded', 'vimeo', 'other'],
      default: 'youtube'
    }
  }],
  documents: [{
    name: String,
    url: String,
    type: String
  }],
  fundraiser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  beneficiary: {
    name: {
      type: String,
      required: [true, 'Beneficiary name is required']
    },
    relationship: {
      type: String,
      required: false
    },
    age: Number,
    gender: {
      type: String,
      enum: ['male', 'female', 'other']
    },
    contact: {
      phone: String,
      email: String
    },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String
    }
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected', 'active', 'completed', 'paused', 'cancelled'],
    default: 'pending' // Changed default to 'pending' for admin approval workflow
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  tags: [String],
  location: {
    city: String,
    state: String,
    country: {
      type: String,
      default: 'India'
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  timeline: {
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    },
    duration: {
      type: Number, // in days
      default: 30
    }
  },
  updates: [{
    title: String,
    description: String,
    images: [String],
    date: {
      type: Date,
      default: Date.now
    },
    isPublic: {
      type: Boolean,
      default: true
    }
  }],
  milestones: [{
    amount: Number,
    description: String,
    achieved: {
      type: Boolean,
      default: false
    },
    achievedDate: Date
  }],
  socialSharing: {
    facebook: Number,
    twitter: Number,
    whatsapp: Number,
    linkedin: Number,
    total: {
      type: Number,
      default: 0
    }
  },
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    uniqueViews: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    donations: {
      type: Number,
      default: 0
    },
    avgDonationAmount: {
      type: Number,
      default: 0
    }
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
    verificationNotes: String
  },
  adminNotes: String,
  rejectionReason: String,
  lastDonationDate: Date,
  isActive: {
    type: Boolean,
    default: false // Changed to false - campaigns should be inactive until approved by admin
  }
}, {
  timestamps: true
});

// Indexes for better performance
campaignSchema.index({ status: 1 });
campaignSchema.index({ category: 1 });
campaignSchema.index({ fundraiser: 1 });
campaignSchema.index({ isFeatured: 1, status: 1 });
campaignSchema.index({ 'timeline.endDate': 1 });
campaignSchema.index({ currentAmount: 1, goalAmount: 1 });
campaignSchema.index({ createdAt: -1 });

// Virtual for progress percentage
campaignSchema.virtual('progressPercentage').get(function() {
  return Math.round((this.currentAmount / this.goalAmount) * 100);
});

// Virtual for days remaining
campaignSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const endDate = new Date(this.timeline.endDate);
  const diffTime = endDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
});

// Virtual for isCompleted
campaignSchema.virtual('isCompleted').get(function() {
  return this.currentAmount >= this.goalAmount || this.daysRemaining <= 0;
});

// Method to update analytics
campaignSchema.methods.updateAnalytics = function(type, increment = 1) {
  if (this.analytics[type] !== undefined) {
    this.analytics[type] += increment;
  }
  return this.save();
};

// Method to add update
campaignSchema.methods.addUpdate = function(updateData) {
  this.updates.push(updateData);
  return this.save();
};

// Method to check if campaign is active
campaignSchema.methods.checkIfActive = function() {
  const now = new Date();
  return this.status === 'active' && 
         this.isActive && 
         now <= this.timeline.endDate && 
         this.currentAmount < this.goalAmount;
};

module.exports = mongoose.model('Campaign', campaignSchema);



