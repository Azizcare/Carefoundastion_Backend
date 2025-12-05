const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Blog title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  excerpt: {
    type: String,
    maxlength: [500, 'Excerpt cannot exceed 500 characters']
  },
  content: {
    type: String,
    required: [true, 'Blog content is required']
  },
  featuredImage: {
    url: String,
    publicId: String,
    caption: String
  },
  images: [{
    url: String,
    publicId: String,
    caption: String
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: [
      'success_story',
      'media_coverage',
      'impact_story',
      'event_highlights',
      'announcement',
      'general'
    ],
    default: 'general'
  },
  tags: [String],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  },
  publishedAt: Date
}, {
  timestamps: true
});

// Indexes
blogSchema.index({ slug: 1 });
blogSchema.index({ status: 1 });
blogSchema.index({ category: 1 });
blogSchema.index({ isFeatured: 1 });
blogSchema.index({ publishedAt: -1 });

// Pre-save middleware to generate slug
blogSchema.pre('save', async function(next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    // Ensure uniqueness
    const slugRegex = new RegExp(`^${this.slug}(-\\d+)?$`, 'i');
    const count = await this.constructor.countDocuments({ slug: slugRegex });
    if (count > 0) {
      this.slug = `${this.slug}-${count + 1}`;
    }
  }
  next();
});

module.exports = mongoose.model('Blog', blogSchema);

