if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

console.log('ENV CHECK - MONGO_URI exists:', !!process.env.MONGO_URI);
console.log('ENV CHECK - JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('ENV CHECK - NODE_ENV:', process.env.NODE_ENV);

const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const Shop = require('./models/Shop');
const User = require('./models/User');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const reviewRoutes = require('./routes/review');

const app = express();

const allowedOrigins = [
  'http://localhost:5175',
  'http://localhost:7000',
  'http://192.168.1.4:5175',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/public', reviewRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
console.log('Frontend dist path:', frontendDist);
console.log('Dist exists:', require('fs').existsSync(frontendDist));
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    const indexPath = path.join(frontendDist, 'index.html');
    if (require('fs').existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({ message: 'Frontend not built. Run npm run build first.' });
    }
  }
});

const PORT = process.env.PORT || 7000;

async function expireAccounts() {
  try {
    const expiredShops = await Shop.find({ isActive: true, expiresAt: { $ne: null, $lte: new Date() } }).select('_id owner');
    if (!expiredShops.length) return;
    const shopIds = expiredShops.map((shop) => shop._id);
    const ownerIds = expiredShops.map((shop) => shop.owner).filter(Boolean);
    await Shop.updateMany({ _id: { $in: shopIds } }, { $set: { isActive: false } });
    await User.updateMany({ _id: { $in: ownerIds } }, { $set: { isActive: false } });
    console.log(`Expired ${expiredShops.length} shop account(s)`);
  } catch (error) {
    console.error('Expiry check failed:', error.message);
  }
}

connectDB().then(() => {
  expireAccounts();
  setInterval(expireAccounts, 60 * 1000);
  app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
});
