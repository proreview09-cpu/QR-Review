const ActivityLog = require('../models/ActivityLog');

async function log(action, entity, description, options = {}) {
  try {
    await ActivityLog.create({
      action,
      entity,
      entityId: options.entityId || null,
      description,
      details: options.details || null,
      performedBy: options.performedBy || 'system',
      performedByRole: options.performedByRole || null,
      shop: options.shop || null,
      ip: options.ip || null,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('Logging failed:', err.message);
  }
}

module.exports = { log };
