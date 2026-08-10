require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Shop = require('./models/Shop');
const Review = require('./models/Review');
const { generateQR } = require('./services/qrService');

async function seedTest() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB Connected');

  const testEmail = 'shop@test.com';
  let owner = await User.findOne({ email: testEmail });
  if (!owner) {
    owner = await User.create({
      name: 'Rajesh Patel',
      email: testEmail,
      password: 'test123',
      role: 'shop_owner',
    });
    console.log(`Test shop owner created: ${testEmail} / test123`);
  } else {
    console.log('Test shop owner already exists');
  }

  const existingShop = await Shop.findOne({ owner: owner._id });
  let shop;
  if (!existingShop) {
    shop = await Shop.create({
      shopName: 'Patel General Store',
      businessName: 'Patel General Store & Mart',
      googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJ-test-place-id',
      reviewTone: 'friendly',
      owner: owner._id,
      isActive: true,
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const { url, qrDataUrl } = await generateQR(shop._id.toString(), frontendUrl);
    shop.qrCodeData = qrDataUrl;
    await shop.save();
    console.log(`Test shop created: ${shop.shopName}`);
    console.log(`Review Link: ${url}`);

    const { generateReviews } = require('./services/openaiService');
    const reviews = await generateReviews(shop.shopName, shop.businessName, shop.reviewTone, 50);
    await Review.insertMany(reviews.map((content) => ({ shop: shop._id, content })));
    console.log(`Generated ${reviews.length} mock reviews`);

    shop = await Shop.findById(shop._id);
  } else {
    shop = existingShop;
    console.log('Test shop already exists');
  }

  console.log('\n=== TEST CREDENTIALS ===');
  console.log('Admin:    admin@qrreview.com / admin123');
  console.log('Owner:    shop@test.com / test123');
  console.log(`Shop:     ${shop.shopName}`);
  console.log(`Review Link: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/review/${shop._id}`);

  await mongoose.disconnect();
  process.exit(0);
}

seedTest().catch((err) => { console.error(err); process.exit(1); });
