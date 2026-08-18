const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Shop = require('../models/Shop');
const Category = require('../models/Category');
const Review = require('../models/Review');
const Setting = require('../models/Setting');
const { OAuth2Client } = require('google-auth-library');
const { log } = require('../services/logService');
const { generateQR } = require('../services/qrService');
const { generateReviews } = require('../services/openaiService');
const { reviewUrlFromPlaceId } = require('../services/googleService');
const { notifyOwner } = require('../services/notificationService');

function expiryFromDays(value) {
  if (!value || value === 0) return null;
  return new Date(Date.now() + Number(value) * 24 * 60 * 60 * 1000);
}

exports.register = async (req, res) => {
  try {
    const { name, email, password, shop } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'shop_owner',
      isActive: true,
    });

    let createdShop = null;
    if (shop && shop.shopName) {
      let categoryId = shop.category || null;
      if (!categoryId && shop.customCategoryName) {
        const cat = await Category.create({
          name: shop.customCategoryName,
          description: '',
          defaultTone: shop.reviewTone || 'friendly',
          defaultLanguage: shop.language || 'english',
          isActive: true,
        });
        categoryId = cat._id;
      }

      const shopDoc = await Shop.create({
        shopName: shop.shopName,
        businessName: shop.businessName || shop.shopName,
        ownerName: name,
        googleReviewUrl: shop.googleReviewUrl || (shop.googlePlaceId ? reviewUrlFromPlaceId(shop.googlePlaceId) : ''),
        reviewTone: shop.reviewTone || 'friendly',
        address: shop.address || '',
        phone: shop.phone || '',
        language: shop.language || 'english',
        aiPrompt: shop.aiPrompt || '',
        promptMode: shop.promptMode === 'override' ? 'override' : 'combine',
        customerFields: Array.isArray(shop.customerFields) ? shop.customerFields : [],
        canOwnerSetTone: shop.canOwnerSetTone || false,
        expiresAt: expiryFromDays(shop.validityDays === undefined ? 30 : shop.validityDays),
        reviewPoolMin: shop.reviewPoolMin || 50,
        reviewBatchSize: shop.reviewBatchSize || 50,
        category: categoryId,
        owner: user._id,
        googlePlaceId: shop.googlePlaceId || '',
      });

      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:5175';
      const { url, qrDataUrl } = await generateQR(shopDoc._id.toString(), `${protocol}://${host}`);
      shopDoc.qrCodeData = qrDataUrl;
      await shopDoc.save();

      createdShop = { _id: shopDoc._id, shopName: shopDoc.shopName, reviewLink: url };

      generateReviews(shopDoc.shopName, shopDoc.businessName, shopDoc.reviewTone, shopDoc.reviewBatchSize || 50, shopDoc.language, shopDoc._id, shopDoc.aiPrompt || '', shopDoc.promptMode || 'combine', {
        ownerName: shopDoc.ownerName,
        address: shopDoc.address,
        phone: shopDoc.phone,
      })
        .then((reviews) => {
          Review.insertMany(reviews.map((content) => ({ shop: shopDoc._id, content })));
          notifyOwner(user._id, shopDoc._id, `${reviews.length} reviews generated for "${shopDoc.shopName}" — your review pool is ready!`, 'success');
        })
        .catch((genErr) => console.error('Review generation failed after registration (background):', genErr.message));

      log('CREATE', 'shop', `Shop "${shopDoc.shopName}" created via self-registration`, { performedBy: user.email, shop: shopDoc._id });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    log('CREATE', 'auth', `New owner registered: ${user.email}`, { performedBy: user.email });
    res.status(201).json({ token, user, shop: createdShop });
  } catch (error) {
    log('ERROR', 'auth', `Registration error: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: 'Google token is required' });

    const clientIdSetting = await Setting.findOne({ key: 'googleClientId' });
    const clientId = clientIdSetting?.value;
    if (!clientId) {
      return res.status(400).json({ message: 'Google sign-in is not configured yet' });
    }

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(401).json({ message: 'Invalid Google token' });
    }
    const { email, name, email_verified } = payload;
    if (!email_verified) {
      return res.status(401).json({ message: 'Google email is not verified' });
    }

    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await User.create({
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        password: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
        role: 'shop_owner',
        isActive: true,
      });
      log('CREATE', 'auth', `New owner registered via Google: ${email}`, { performedBy: email });
    }
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is inactive' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    log('LOGIN', 'auth', `${user.name} logged in via Google`, { performedBy: user.email });
    res.json({ token, user, created: user.createdAt && Date.now() - new Date(user.createdAt).getTime() < 5000 });
  } catch (error) {
    log('ERROR', 'auth', `Google sign-in error: ${error.message}`);
    res.status(401).json({ message: 'Google sign-in failed: ' + error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) {
      log('ERROR', 'auth', `Failed login attempt: ${email}`, { details: 'User not found or inactive', ip: req.ip });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      log('ERROR', 'auth', `Failed login attempt: ${email}`, { details: 'Wrong password', ip: req.ip });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    log('LOGIN', 'auth', `${user.name} (${user.role}) logged in`, { performedBy: user.email, ip: req.ip });
    res.json({ token, user });
  } catch (error) {
    log('ERROR', 'auth', `Login error: ${error.message}`, { ip: req.ip });
    res.status(500).json({ message: error.message });
  }
};

exports.getMe = async (req, res) => {
  res.json({ user: req.user });
};
