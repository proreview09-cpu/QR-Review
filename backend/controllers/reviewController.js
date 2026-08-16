const Shop = require('../models/Shop');
const Review = require('../models/Review');
const { generateReviews } = require('../services/openaiService');
const { log } = require('../services/logService');

exports.getShopPublic = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.shopId);
    const expired = shop?.expiresAt && shop.expiresAt <= new Date();
    if (!shop || !shop.isActive || expired) {
      if (shop && expired) await Shop.findByIdAndUpdate(shop._id, { isActive: false });
      return res.status(404).json({ message: 'This review link is inactive or expired' });
    }

    const unusedReviews = await Review.find({ shop: shop._id, isUsed: false })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('_id content');

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:5175';
    const frontendUrl = `${protocol}://${host}`;

    res.json({
      shop: {
        _id: shop._id,
        shopName: shop.shopName,
        businessName: shop.businessName,
        googleReviewUrl: shop.googleReviewUrl,
        reviewTone: shop.reviewTone,
      },
      reviews: unusedReviews,
      reviewCount: unusedReviews.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.copyReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (review.isUsed) return res.status(400).json({ message: 'Review already used' });
    const shop = await Shop.findById(review.shop);
    const expired = shop?.expiresAt && shop.expiresAt <= new Date();
    if (!shop || !shop.isActive || expired) return res.status(404).json({ message: 'This review link is inactive or expired' });

    review.isUsed = true;
    review.usedAt = new Date();
    review.copiedByIp = req.ip || req.connection?.remoteAddress || '';
    review.copiedByUA = (req.headers['user-agent'] || '').substring(0, 200);
    await review.save();

    await Shop.findByIdAndUpdate(review.shop, { $inc: { totalReviewsCopied: 1 } });

    const unusedCount = await Review.countDocuments({ shop: review.shop, isUsed: false });

    log('COPY', 'review', `Review copied for "${shop.shopName}"`, { shop: shop._id, ip: req.ip });

    if (unusedCount < shop.reviewPoolMin) {
      generateReviews(shop.shopName, shop.businessName, shop.reviewTone, shop.reviewBatchSize || 10, shop.language, shop._id, shop.aiPrompt || '', 'override', {
        ownerName: shop.ownerName,
        address: shop.address,
        phone: shop.phone,
      })
        .then(async (reviews) => {
          await Review.insertMany(reviews.map((content) => ({ shop: shop._id, content })));
        })
        .catch(console.error);
    }

    res.json({
      message: 'Review copied successfully',
      googleReviewUrl: shop.googleReviewUrl,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.generateMore = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.shopId);
    const expired = shop?.expiresAt && shop.expiresAt <= new Date();
    if (!shop || !shop.isActive || expired) return res.status(404).json({ message: 'This review link is inactive or expired' });

    const unusedCount = await Review.countDocuments({ shop: shop._id, isUsed: false });
    const needed = Math.max(0, shop.reviewPoolMin - unusedCount);

    if (needed > 0) {
      const reviews = await generateReviews(shop.shopName, shop.businessName, shop.reviewTone, needed, shop.language, shop._id, shop.aiPrompt || '', 'override', {
        ownerName: shop.ownerName,
        address: shop.address,
        phone: shop.phone,
      });
      await Review.insertMany(reviews.map((content) => ({ shop: shop._id, content })));
      return res.json({ message: `Generated ${needed} new reviews`, generated: needed });
    }

    res.json({ message: 'Pool is full', generated: 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.markPosted = async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    review.isPosted = true;
    review.postedAt = new Date();
    await review.save();

    await Shop.findByIdAndUpdate(review.shop, { $inc: { totalReviewsPosted: 1 } });

    const shop = await Shop.findById(review.shop);
    log('POSTED', 'review', `Review posted on Google for "${shop.shopName}"`, { shop: shop._id, ip: req.ip });

    res.json({ message: 'Review marked as posted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
