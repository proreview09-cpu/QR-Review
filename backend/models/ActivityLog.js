const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'ERROR', 'COPY', 'POSTED', 'GENERATE', 'REGENERATE', 'SEED', 'SETTINGS'],
    required: true,
  },
  entity: { type: String, required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId },
  description: { type: String, required: true },
  details: { type: mongoose.Schema.Types.Mixed },
  performedBy: { type: String },
  performedByRole: { type: String },
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },
  ip: { type: String },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

activityLogSchema.index({ timestamp: -1 });
activityLogSchema.index({ action: 1 });
activityLogSchema.index({ shop: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
