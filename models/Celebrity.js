const mongoose = require('mongoose');

const celebritySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Celebrity name is required'],
    trim: true
  },
  designation: {
    type: String,
    trim: true
  },
  photo: {
    url: String,
    publicId: String
  },
  type: {
    type: String,
    enum: ['celebrity', 'influencer', 'social_media_personality', 'other'],
    default: 'celebrity'
  },
  videos: [{
    url: {
      type: String,
      required: true
    },
    platform: {
      type: String,
      enum: ['youtube', 'vimeo', 'instagram', 'facebook', 'other'],
      default: 'youtube'
    },
    thumbnail: String,
    title: String,
    description: String,
    duration: Number,
    views: {
      type: Number,
      default: 0
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  socialLinks: {
    youtube: String,
    instagram: String,
    facebook: String,
    twitter: String,
    linkedin: String
  },
  endorsement: {
    message: String,
    date: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
celebritySchema.index({ status: 1 });
celebritySchema.index({ isFeatured: 1 });
celebritySchema.index({ order: 1 });

module.exports = mongoose.model('Celebrity', celebritySchema);

