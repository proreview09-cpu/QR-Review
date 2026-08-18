const Notification = require('../models/Notification');

async function notifyOwner(ownerId, shopId, message, type = 'info') {
  try {
    await Notification.create({ user: ownerId, shop: shopId || null, message, type });
  } catch (error) {
    console.error('Notification create failed:', error.message);
  }
}

module.exports = { notifyOwner };