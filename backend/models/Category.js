const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  slug: {
    type: String,
    trim: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    trim: true
  },
  aiPrompt: {
    type: String,
    trim: true
  },
  defaultPrompt: {
    type: String,
    trim: true,
    default: ''
  },
  defaultTone: {
    type: String,
    enum: ['professional', 'friendly', 'casual', 'enthusiastic', 'grateful', 'humorous'],
    default: 'friendly'
  },
  defaultLanguage: {
    type: String,
    enum: ['english', 'gujarati', 'hindi'],
    default: 'english'
  },
  reviewPoolMin: {
    type: Number,
    default: 50
  },
  reviewBatchSize: {
    type: Number,
    default: 50
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  icon: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    trim: true
  }
}, { timestamps: true });

// Create slug from name before saving
categorySchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

module.exports = mongoose.model('Category', categorySchema);