const mongoose = require('mongoose');

const customerFieldSchema = new mongoose.Schema({
  key: { type: String, required: true },
  label: { type: String, required: true },
  enabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
}, { _id: false });

const shopSchema = new mongoose.Schema({
  shopName: { type: String, required: true, trim: true },
  businessName: { type: String, required: true, trim: true },
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
  canOwnerSetTone: { type: Boolean, default: false },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date, default: null },
  totalReviewsCopied: { type: Number, default: 0 },
  totalReviewsPosted: { type: Number, default: 0 },
  reviewPoolMin: { type: Number, default: 50 },
  reviewBatchSize: { type: Number, default: 50 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  aiPrompt: { type: String, trim: true, default: '' },
  promptMode: {
    type: String,
    enum: ['combine', 'override'],
    default: 'combine',
  },
  customerFields: {
    type: [customerFieldSchema],
    default: [],
  },
}, { timestamps: true });

module.exports = mongoose.model('Shop', shopSchema);
