const Shop = require('../models/Shop');
const Review = require('../models/Review');
const Category = require('../models/Category');
const Setting = require('../models/Setting');
const { generateReviews } = require('../services/openaiService');
const { autocompletePlaces, getPlaceDetails, reviewUrlFromPlaceId } = require('../services/googleService');
const { log } = require('../services/logService');

exports.getPublicConfig = async (req, res) => {
  try {
    const clientIdSetting = await Setting.findOne({ key: 'googleClientId' });
    res.json({ googleClientId: clientIdSetting?.value || '' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.googleAutocomplete = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || String(query).trim().length < 3) {
      return res.status(400).json({ message: 'Type at least 3 characters' });
    }
    const suggestions = await autocompletePlaces(String(query).trim());
    res.json({ suggestions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.googlePlaceLookup = async (req, res) => {
  try {
    const { placeId } = req.body;
    if (!placeId) return res.status(400).json({ message: 'placeId is required' });
    const place = await getPlaceDetails(placeId);
    res.json({ place });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getActiveCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).select('name').sort({ name: 1 }).lean();
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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
googleReviewUrl: shop.googleReviewUrl || (shop.googlePlaceId ? reviewUrlFromPlaceId(shop.googlePlaceId) : ''),
        reviewTone: shop.reviewTone,
      },
      customerFields: (shop.customerFields || []).filter((field) => field.enabled),
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
    if (req.body?.details && typeof req.body.details === 'object') {
      const clean = {};
      for (const [key, value] of Object.entries(req.body.details)) {
        clean[key] = String(value || '').trim().slice(0, 300);
      }
      review.customerDetails = clean;
    }
    await review.save();

    await Shop.findByIdAndUpdate(review.shop, { $inc: { totalReviewsCopied: 1 } });

    const unusedCount = await Review.countDocuments({ shop: review.shop, isUsed: false });

    log('COPY', 'review', `Review copied for "${shop.shopName}"`, { shop: shop._id, ip: req.ip });

    if (unusedCount < shop.reviewPoolMin) {
      const existing = await Review.find({ shop: shop._id }).select('content').lean();
      generateReviews(shop.shopName, shop.businessName, shop.reviewTone, shop.reviewBatchSize || 10, shop.language, shop._id, shop.aiPrompt || '', shop.promptMode || 'combine', {
        ownerName: shop.ownerName,
        address: shop.address,
        phone: shop.phone,
      }, existing.map((r) => r.content))
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
      const existing = await Review.find({ shop: shop._id }).select('content').lean();
      const reviews = await generateReviews(shop.shopName, shop.businessName, shop.reviewTone, needed, shop.language, shop._id, shop.aiPrompt || '', shop.promptMode || 'combine', {
        ownerName: shop.ownerName,
        address: shop.address,
        phone: shop.phone,
      }, existing.map((r) => r.content));
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
