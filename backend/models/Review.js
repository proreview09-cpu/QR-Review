const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  content: { type: String, required: true },
  isUsed: { type: Boolean, default: false },
  usedAt: { type: Date },
  copiedByIp: { type: String },
  copiedByUA: { type: String },
  isPosted: { type: Boolean, default: false },
  postedAt: { type: Date },
  customerDetails: { type: Map, of: String, default: {} },
}, { timestamps: true });

reviewSchema.index({ shop: 1, isUsed: 1 });
reviewSchema.index({ shop: 1, isPosted: 1 });

module.exports = mongoose.model('Review', reviewSchema);
