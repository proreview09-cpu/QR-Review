require('dotenv').config();
const mongoose = require('mongoose');
const Shop = require('./models/Shop');
const { generateQR } = require('./services/qrService');

async function fixQR() {
  await mongoose.connect(process.env.MONGO_URI);
  const shop = await Shop.findOne({ shopName: 'Patel General Store' });
  if (!shop) { console.log('Shop not found'); process.exit(1); }

  const frontendUrl = process.env.FRONTEND_URL;
  const { url, qrDataUrl } = await generateQR(shop._id.toString(), frontendUrl);
  shop.qrCodeData = qrDataUrl;
  await shop.save();

  console.log('QR regenerated!');
  console.log('Review URL:', url);
  console.log('Shop ID:', shop._id);
  await mongoose.disconnect();
  process.exit(0);
}
fixQR().catch(console.error);
