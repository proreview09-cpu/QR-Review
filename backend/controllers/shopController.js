const Shop = require('../models/Shop');
const Review = require('../models/Review');
const TokenUsage = require('../models/TokenUsage');
const Category = require('../models/Category');
const { generateReviews } = require('../services/openaiService');
const { generateQR } = require('../services/qrService');
const { reviewUrlFromPlaceId } = require('../services/googleService');
const { log } = require('../services/logService');
const { notifyOwner } = require('../services/notificationService');
const Notification = require('../models/Notification');

function expiryFromDays(value) {
  if (!value || value === 0) return null;
  return new Date(Date.now() + Number(value) * 24 * 60 * 60 * 1000);
}

exports.createMyShop = async (req, res) => {
  try {
    const existing = await Shop.findOne({ owner: req.user._id });
    if (existing) return res.status(400).json({ message: 'You already have a business linked to your account' });

    const { shopName, businessName, googleReviewUrl, reviewTone, address, phone, language, aiPrompt, promptMode, customerFields, googlePlaceId, category, customCategoryName, validityDays, reviewPoolMin, reviewBatchSize } = req.body;
    if (!shopName || !businessName) return res.status(400).json({ message: 'Business name and shop name are required' });

    let categoryId = category || null;
    if (!categoryId && customCategoryName) {
      const cat = await Category.create({
        name: customCategoryName,
        description: '',
        defaultTone: reviewTone || 'friendly',
        defaultLanguage: language || 'english',
        isActive: true,
      });
      categoryId = cat._id;
    }

    const shop = await Shop.create({
      shopName,
      businessName,
      ownerName: req.user.name,
      googleReviewUrl: googleReviewUrl || (googlePlaceId ? reviewUrlFromPlaceId(googlePlaceId) : ''),
      reviewTone: reviewTone || 'friendly',
      address: address || '',
      phone: phone || '',
      language: language || 'english',
      aiPrompt: aiPrompt || '',
      promptMode: promptMode === 'override' ? 'override' : 'combine',
      customerFields: Array.isArray(customerFields) ? customerFields : [],
      canOwnerSetTone: true,
      expiresAt: expiryFromDays(validityDays === undefined ? 30 : validityDays),
      reviewPoolMin: reviewPoolMin || 50,
      reviewBatchSize: reviewBatchSize || 50,
      category: categoryId,
      owner: req.user._id,
      googlePlaceId: googlePlaceId || '',
    });

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:5175';
    const { url, qrDataUrl } = await generateQR(shop._id.toString(), `${protocol}://${host}`);
    shop.qrCodeData = qrDataUrl;
    await shop.save();

    generateReviews(shop.shopName, shop.businessName, shop.reviewTone, shop.reviewBatchSize || 50, shop.language, shop._id, shop.aiPrompt || '', shop.promptMode || 'combine', {
      ownerName: shop.ownerName,
      address: shop.address,
      phone: shop.phone,
    })
      .then((reviews) => {
        Review.insertMany(reviews.map((content) => ({ shop: shop._id, content })));
        notifyOwner(req.user._id, shop._id, `${reviews.length} reviews generated for "${shop.shopName}" — your review pool is ready!`, 'success');
      })
      .catch((genErr) => console.error('Review generation failed after shop setup (background):', genErr.message));

    log('CREATE', 'shop', `Shop "${shop.shopName}" created by owner via setup wizard`, { performedBy: req.user.email, shop: shop._id });
    res.status(201).json({ shop, reviewLink: url });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

function resolveSelectedShop(shops, requestedId) {
  if (requestedId && shops.some((shop) => shop._id.toString() === requestedId)) {
    return shops.find((shop) => shop._id.toString() === requestedId)._id;
  }
  return shops[0]._id;
}

exports.getMyShop = async (req, res) => {
  try {
    const shops = await Shop.find({ owner: req.user._id }).select('_id shopName businessName isActive').sort({ createdAt: 1 }).lean();
    if (!shops.length) return res.status(404).json({ message: 'No shop found' });

    const selectedId = resolveSelectedShop(shops, req.query.shop);
    const shop = await Shop.findById(selectedId).populate('category', 'name defaultTone defaultLanguage defaultPrompt');

    const reviewStats = await Review.aggregate([
      { $match: { shop: shop._id } },
      { $group: { _id: null, total: { $sum: 1 }, used: { $sum: { $cond: ['$isUsed', 1, 0] } }, posted: { $sum: { $cond: ['$isPosted', 1, 0] } } } },
    ]);

    const tokenStats = await TokenUsage.aggregate([
      { $match: { shop: shop._id } },
      { $group: { _id: null, totalTokens: { $sum: '$totalTokens' }, totalCalls: { $sum: 1 }, promptTokens: { $sum: '$promptTokens' }, completionTokens: { $sum: '$completionTokens' }, reviewsGenerated: { $sum: '$reviewsGenerated' } } },
    ]);

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:5175';
    const frontendUrl = `${protocol}://${host}`;
    res.json({
      shop,
      shops,
      reviewLink: `${frontendUrl}/review/${shop._id}`,
      stats: {
        totalReviews: reviewStats[0]?.total || 0,
        usedReviews: reviewStats[0]?.used || 0,
        postedReviews: reviewStats[0]?.posted || 0,
        availableReviews: (reviewStats[0]?.total || 0) - (reviewStats[0]?.used || 0),
        totalCopied: shop.totalReviewsCopied,
        totalPosted: shop.totalReviewsPosted,
      },
      tokenUsage: tokenStats[0] || { totalTokens: 0, totalCalls: 0, promptTokens: 0, completionTokens: 0, reviewsGenerated: 0 },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateMyShop = async (req, res) => {
  try {
    const shops = await Shop.find({ owner: req.user._id }).select('_id').sort({ createdAt: 1 }).lean();
    if (!shops.length) return res.status(404).json({ message: 'No shop found' });

    const selectedId = resolveSelectedShop(shops, req.query.shop);
    const shop = await Shop.findById(selectedId);
    if (!shop.canOwnerSetTone) return res.status(403).json({ message: 'Admin has disabled this feature' });

    const { reviewTone, language } = req.body;
    if (reviewTone) shop.reviewTone = reviewTone;
    if (language) shop.language = language;

    const needsRegen = reviewTone || language;
    await shop.save();

    if (needsRegen) {
      const oldReviews = await Review.find({ shop: shop._id }).select('content').lean();
      await Review.deleteMany({ shop: shop._id });
      generateReviews(shop.shopName, shop.businessName, shop.reviewTone, shop.reviewBatchSize || 50, shop.language, shop._id, shop.aiPrompt || '', shop.promptMode || 'combine', {
        ownerName: shop.ownerName,
        address: shop.address,
        phone: shop.phone,
      }, oldReviews.map((r) => r.content))
        .then((reviews) => Review.insertMany(reviews.map((content) => ({ shop: shop._id, content }))))
        .catch((genErr) => console.error('Review regeneration failed (background):', genErr.message));
    }

    res.json({ shop });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyShopReviews = async (req, res) => {
  try {
    const shops = await Shop.find({ owner: req.user._id }).select('_id').sort({ createdAt: 1 }).lean();
    if (!shops.length) return res.status(404).json({ message: 'No shop found' });

    const selectedId = resolveSelectedShop(shops, req.query.shop);

    const reviews = await Review.find({ shop: selectedId, isUsed: true })
      .sort({ usedAt: -1 })
      .limit(20)
      .select('content isUsed usedAt isPosted postedAt customerDetails');

    res.json({ reviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    res.json({ notifications, unread: notifications.filter((n) => !n.read).length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.markNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getShopStats = async (req, res) => {
  try {
    const shops = await Shop.find({ owner: req.user._id }).select('_id').sort({ createdAt: 1 }).lean();
    if (!shops.length) return res.status(404).json({ message: 'No shop found' });

    const selectedId = resolveSelectedShop(shops, req.query.shop);
    const shop = await Shop.findById(selectedId).populate('category', 'name defaultTone defaultLanguage defaultPrompt');

    const reviewStats = await Review.aggregate([
      { $match: { shop: shop._id } },
      { $group: { _id: null, total: { $sum: 1 }, used: { $sum: { $cond: ['$isUsed', 1, 0] } }, posted: { $sum: { $cond: ['$isPosted', 1, 0] } } } },
    ]);

    res.json({
      shop,
      stats: {
        totalReviews: reviewStats[0]?.total || 0,
        usedReviews: reviewStats[0]?.used || 0,
        postedReviews: reviewStats[0]?.posted || 0,
        availableReviews: (reviewStats[0]?.total || 0) - (reviewStats[0]?.used || 0),
        totalCopied: shop.totalReviewsCopied,
        totalPosted: shop.totalReviewsPosted,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
