const mongoose = require('mongoose');

const tokenUsageSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },
  provider: { type: String, default: 'openai' },
  model: { type: String, default: 'gpt-4o-mini' },
  promptTokens: { type: Number, default: 0 },
  completionTokens: { type: Number, default: 0 },
  totalTokens: { type: Number, default: 0 },
  reviewsGenerated: { type: Number, default: 0 },
  success: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('TokenUsage', tokenUsageSchema);
