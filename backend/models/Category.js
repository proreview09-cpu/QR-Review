const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  description: { type: String, trim: true, default: '' },
  defaultPrompt: { type: String, trim: true, default: '' },
  defaultTone: {
    type: String,
    enum: ['professional', 'friendly', 'casual', 'enthusiastic', 'grateful', 'humorous'],
    default: 'friendly',
  },
  defaultLanguage: {
    type: String,
    enum: ['english', 'gujarati', 'hindi'],
    default: 'english',
  },
  isActive: { type: Boolean, default: true },
  reviewPoolMin: { type: Number, default: 50 },
  reviewBatchSize: { type: Number, default: 50 },
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
