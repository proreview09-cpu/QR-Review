const mongoose = require('mongoose');

const aiProviderStatusSchema = new mongoose.Schema({
  provider: { type: String, required: true, unique: true },
  status: { type: String, enum: ['unknown', 'active', 'failed'], default: 'unknown' },
  lastError: { type: String, default: '' },
  lastAttemptAt: { type: Date },
  lastSuccessAt: { type: Date },
  lastFailureAt: { type: Date },
  consecutiveFailures: { type: Number, default: 0 },
  models: { type: [String], default: [] },
  selectedModel: { type: String, default: '' },
  quotaStatus: { type: String, enum: ['unknown', 'available', 'exhausted'], default: 'unknown' },
  lastHealthCheckAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('AIProviderStatus', aiProviderStatusSchema);
