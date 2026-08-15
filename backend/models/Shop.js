const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  shopName: { type: String, required: true, trim: true },
  businessName: { type: String, required: true, trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  customCategory: { type: String, trim: true, default: '' },
  ownerName: { type: String, trim: true },
  address: { type: String, trim: true },
  phone: { type: String, trim: true },
  googlePlaceId: { type: String, trim: true },
  googleReviewUrl: { type: String, required: true, trim: true },
  qrCodeData: { type: String },
  reviewTone: {
    type: String,
    enum: ['professional', 'friendly', 'casual', 'enthusiastic', 'grateful', 'humorous'],
    default: 'friendly',
  },
  language: {
    type: String,
    enum: ['english', 'gujarati', 'hindi'],
    default: 'english',
  },
  customPrompt: { type: String, trim: true, default: '' },
  promptMode: {
    type: String,
    enum: ['general', 'override', 'combine'],
    default: 'general',
  },
  canOwnerSetTone: { type: Boolean, default: false },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date, default: null },
  totalReviewsCopied: { type: Number, default: 0 },
  totalReviewsPosted: { type: Number, default: 0 },
  reviewPoolMin: { type: Number, default: 50 },
  reviewBatchSize: { type: Number, default: 50 },
}, { timestamps: true });

module.exports = mongoose.model('Shop', shopSchema);
