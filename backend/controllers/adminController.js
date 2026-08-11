const User = require('../models/User');
const Shop = require('../models/Shop');
const Review = require('../models/Review');
const Setting = require('../models/Setting');
const TokenUsage = require('../models/TokenUsage');
const ActivityLog = require('../models/ActivityLog');
const { generateQR } = require('../services/qrService');
const { generateReviews } = require('../services/openaiService');
const { log } = require('../services/logService');

exports.getDashboard = async (req, res) => {
  try {
    const totalShops = await Shop.countDocuments();
    const activeShops = await Shop.countDocuments({ isActive: true });
    const totalShopOwners = await User.countDocuments({ role: 'shop_owner' });
    const totalReviewsCopied = await Shop.aggregate([
      { $group: { _id: null, total: { $sum: '$totalReviewsCopied' } } },
    ]);
    const totalReviewsGenerated = await Review.countDocuments({});

    const tokenStats = await TokenUsage.aggregate([
      { $group: { _id: null, totalTokens: { $sum: '$totalTokens' }, totalCalls: { $sum: 1 }, promptTokens: { $sum: '$promptTokens' }, completionTokens: { $sum: '$completionTokens' } } },
    ]);

    const recentShops = await Shop.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('owner', 'name email');

    res.json({
      stats: {
        totalShops,
        activeShops,
        totalShopOwners,
        totalReviewsCopied: totalReviewsCopied[0]?.total || 0,
        totalReviewsGenerated,
        tokenUsage: tokenStats[0] || { totalTokens: 0, totalCalls: 0, promptTokens: 0, completionTokens: 0 },
      },
      recentShops,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getShops = async (req, res) => {
  try {
    const shops = await Shop.find().populate('owner', 'name email').sort({ createdAt: -1 });
    res.json({ shops });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createShop = async (req, res) => {
  try {
    const { ownerEmail, ownerName, ownerPassword, shopName, businessName, googleReviewUrl, reviewTone, address, phone, language, canOwnerSetTone, reviewPoolMin, reviewBatchSize } = req.body;

    let owner = await User.findOne({ email: ownerEmail?.toLowerCase() });
    if (!owner) {
      owner = await User.create({
        name: ownerName,
        email: ownerEmail,
        password: ownerPassword || 'password123',
        role: 'shop_owner',
      });
    }

    const shop = await Shop.create({
      shopName,
      businessName,
      ownerName,
      googleReviewUrl,
      reviewTone: reviewTone || 'friendly',
      address: address || '',
      phone: phone || '',
      language: language || 'english',
      canOwnerSetTone: canOwnerSetTone || false,
      reviewPoolMin: reviewPoolMin || 50,
      reviewBatchSize: reviewBatchSize || 50,
      owner: owner._id,
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const { url, qrDataUrl } = await generateQR(shop._id.toString(), frontendUrl);
    shop.qrCodeData = qrDataUrl;
    await shop.save();

    let warnings = [];
    try {
      const reviews = await generateReviews(shopName, businessName, reviewTone || 'friendly', shop.reviewBatchSize || 50, language || 'english', shop._id);
      await Review.insertMany(reviews.map((content) => ({ shop: shop._id, content })));
      log('CREATE', 'reviews', `Generated ${reviews.length} reviews for "${shopName}"`, { performedBy: req.user.email, shop: shop._id });
    } catch (genErr) {
      console.error('Review generation failed, using fallback:', genErr.message);
      warnings.push('OpenAI failed: ' + genErr.message + '. Using mock reviews.');
      log('ERROR', 'reviews', `Review generation failed for "${shopName}": ${genErr.message}`, { performedBy: req.user.email, shop: shop._id });
    }

    log('CREATE', 'shop', `Created shop "${shopName}"`, { performedBy: req.user.email, performedByRole: 'admin', shop: shop._id });
    res.status(201).json({ shop, reviewLink: url, warnings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateShop = async (req, res) => {
  try {
    const shop = await Shop.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('owner', 'name email');
    if (!shop) return res.status(404).json({ message: 'Shop not found' });

    if (req.body.shopName || req.body.businessName || req.body.reviewTone || req.body.language) {
      await Review.deleteMany({ shop: shop._id });
      try {
        const reviews = await generateReviews(shop.shopName, shop.businessName, shop.reviewTone, 50, shop.language, shop._id);
        await Review.insertMany(reviews.map((content) => ({ shop: shop._id, content })));
      } catch (genErr) {
        console.error('Review regeneration failed:', genErr.message);
      }
    }

    log('UPDATE', 'shop', `Updated shop "${shop.shopName}"`, { performedBy: req.user.email, performedByRole: 'admin', shop: shop._id });
    res.json({ shop });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteShop = async (req, res) => {
  try {
    const shop = await Shop.findByIdAndDelete(req.params.id);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    await Review.deleteMany({ shop: shop._id });
    log('DELETE', 'shop', `Deleted shop "${shop.shopName}"`, { performedBy: req.user.email, performedByRole: 'admin', shop: shop._id });
    res.json({ message: 'Shop deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getShop = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id).populate('owner', 'name email');
    if (!shop) return res.status(404).json({ message: 'Shop not found' });

    const reviewStats = await Review.aggregate([
      { $match: { shop: shop._id } },
      { $group: { _id: null, total: { $sum: 1 }, used: { $sum: { $cond: ['$isUsed', 1, 0] } }, posted: { $sum: { $cond: ['$isPosted', 1, 0] } } } },
    ]);

    const tokenStats = await TokenUsage.aggregate([
      { $match: { shop: shop._id } },
      { $group: { _id: null, totalTokens: { $sum: '$totalTokens' }, totalCalls: { $sum: 1 } } },
    ]);

    // Always regenerate QR with current FRONTEND_URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5175';
    console.log('getShop - FRONTEND_URL:', frontendUrl);
    const { qrDataUrl, url: reviewUrl } = await generateQR(shop._id.toString(), frontendUrl);
    shop.qrCodeData = qrDataUrl;
    await shop.save();

    res.json({
      shop,
      stats: {
        totalReviews: reviewStats[0]?.total || 0,
        usedReviews: reviewStats[0]?.used || 0,
        postedReviews: reviewStats[0]?.posted || 0,
        availableReviews: (reviewStats[0]?.total || 0) - (reviewStats[0]?.used || 0),
      },
      tokenUsage: tokenStats[0] || { totalTokens: 0, totalCalls: 0 },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSettings = async (req, res) => {
  try {
    const openaiKey = await Setting.findOne({ key: 'openaiApiKey' });
    const defaultTone = await Setting.findOne({ key: 'defaultTone' });
    const defaultLanguage = await Setting.findOne({ key: 'defaultLanguage' });
    res.json({
      openaiApiKey: openaiKey?.value || '',
      defaultTone: defaultTone?.value || 'friendly',
      defaultLanguage: defaultLanguage?.value || 'english',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { openaiApiKey, defaultTone, defaultLanguage } = req.body;
    if (openaiApiKey !== undefined) {
      await Setting.findOneAndUpdate(
        { key: 'openaiApiKey' },
        { value: openaiApiKey },
        { upsert: true, new: true },
      );
    }
    if (defaultTone) {
      await Setting.findOneAndUpdate(
        { key: 'defaultTone' },
        { value: defaultTone },
        { upsert: true, new: true },
      );
    }
    if (defaultLanguage) {
      await Setting.findOneAndUpdate(
        { key: 'defaultLanguage' },
        { value: defaultLanguage },
        { upsert: true, new: true },
      );
    }
    log('SETTINGS', 'settings', 'Settings updated', { performedBy: req.user.email, performedByRole: 'admin' });
    res.json({ message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createOwner = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({ name, email, password, role: 'shop_owner' });
    log('CREATE', 'owner', `Created shop owner "${name}"`, { performedBy: req.user.email, performedByRole: 'admin' });
    res.status(201).json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getLogs = async (req, res) => {
  try {
    const { page = 1, limit = 30, action } = req.query;
    const filter = {};
    if (action) filter.action = action;

    const logs = await ActivityLog.find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await ActivityLog.countDocuments(filter);

    res.json({ logs, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getShopReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });

    const reviews = await Review.find({ shop: shop._id, isUsed: true })
      .sort({ usedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select('content isUsed usedAt isPosted postedAt copiedByIp copiedByUA createdAt');

    const total = await Review.countDocuments({ shop: shop._id, isUsed: true });

    res.json({ reviews, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
