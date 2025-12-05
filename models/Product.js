const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Product description is required']
  },
  category: {
    type: String,
    required: true,
    enum: [
      'medical',
      'food',
      'education',
      'clothing',
      'shelter',
      'other'
    ]
  },
  image: {
    url: {
      type: String,
      required: [true, 'Product image is required']
    },
    publicId: String
  },
  price: {
    type: Number,
    default: 0,
    min: 0
  },
  isDonationItem: {
    type: Boolean,
    default: true
  },
  targetQuantity: {
    type: Number,
    default: 0
  },
  currentQuantity: {
    type: Number,
    default: 0
  },
  unit: {
    type: String,
    default: 'piece'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'out_of_stock'],
    default: 'active'
  },
  featured: {
    type: Boolean,
    default: false
  },
  priority: {
    type: Number,
    default: 0
  },
  tags: [String],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
productSchema.index({ category: 1, status: 1 });
productSchema.index({ featured: 1, priority: -1 });
productSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);

