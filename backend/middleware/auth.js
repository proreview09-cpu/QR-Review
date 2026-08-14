const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Shop = require('../models/Shop');

const auth = (roles = []) => {
  return async (req, res, next) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ message: 'Access denied' });

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) return res.status(401).json({ message: 'Invalid token' });

      if (user.role === 'shop_owner') {
        const shop = await Shop.findOne({ owner: user._id });
        const expired = shop?.expiresAt && shop.expiresAt <= new Date();
        if (!shop || !shop.isActive || expired) {
          if (shop && expired) await Shop.findByIdAndUpdate(shop._id, { isActive: false });
          if (expired) await User.findByIdAndUpdate(user._id, { isActive: false });
          return res.status(401).json({ message: expired ? 'Account validity has expired' : 'Account is inactive' });
        }
      }

      if (roles.length && !roles.includes(user.role)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      req.user = user;
      next();
    } catch {
      res.status(401).json({ message: 'Invalid token' });
    }
  };
};

module.exports = auth;
