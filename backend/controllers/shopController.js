const Shop = require('../models/Shop');
const Review = require('../models/Review');
const { generateReviews } = require('../services/openaiService');

exports.getMyShop = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.status(404).json({ message: 'No shop found' });

    const reviewStats = await Review.aggregate([
      { $match: { shop: shop._id } },
      { $group: { _id: null, total: { $sum: 1 }, used: { $sum: { $cond: ['$isUsed', 1, 0] } } } },
    ]);

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:5175';
    const frontendUrl = `${protocol}://${host}`;
    res.json({
      shop,
      reviewLink: `${frontendUrl}/review/${shop._id}`,
      stats: {
        totalReviews: reviewStats[0]?.total || 0,
        usedReviews: reviewStats[0]?.used || 0,
        availableReviews: (reviewStats[0]?.total || 0) - (reviewStats[0]?.used || 0),
        totalCopied: shop.totalReviewsCopied,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateMyShop = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.status(404).json({ message: 'No shop found' });
    if (!shop.canOwnerSetTone) return res.status(403).json({ message: 'Admin has disabled this feature' });

    const { reviewTone, language } = req.body;
    if (reviewTone) shop.reviewTone = reviewTone;
    if (language) shop.language = language;

    const needsRegen = reviewTone || language;
    await shop.save();

    if (needsRegen) {
      await Review.deleteMany({ shop: shop._id });
      try {
        const reviews = await generateReviews(shop.shopName, shop.businessName, shop.reviewTone, shop.reviewBatchSize || 50, shop.language, shop._id, shop.customPrompt, shop.promptMode, {
          ownerName: shop.ownerName,
          address: shop.address,
          phone: shop.phone,
        });
        await Review.insertMany(reviews.map((content) => ({ shop: shop._id, content })));
      } catch (genErr) {
        console.error('Review regeneration failed:', genErr.message);
      }
    }

    res.json({ shop });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getShopStats = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.status(404).json({ message: 'No shop found' });

    const reviewStats = await Review.aggregate([
      { $match: { shop: shop._id } },
      { $group: { _id: null, total: { $sum: 1 }, used: { $sum: { $cond: ['$isUsed', 1, 0] } } } },
    ]);

    res.json({
      stats: {
        totalReviews: reviewStats[0]?.total || 0,
        usedReviews: reviewStats[0]?.used || 0,
        availableReviews: (reviewStats[0]?.total || 0) - (reviewStats[0]?.used || 0),
        totalCopied: shop.totalReviewsCopied,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
