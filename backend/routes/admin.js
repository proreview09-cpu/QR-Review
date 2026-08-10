const router = require('express').Router();
const auth = require('../middleware/auth');
const {
  getDashboard,
  getShops,
  createShop,
  updateShop,
  deleteShop,
  getShop,
  getShopReviews,
  getLogs,
  getSettings,
  updateSettings,
  createOwner,
} = require('../controllers/adminController');

router.use(auth(['admin']));

router.get('/dashboard', getDashboard);
router.get('/shops', getShops);
router.post('/shops', createShop);
router.get('/shops/:id', getShop);
router.get('/shops/:id/reviews', getShopReviews);
router.put('/shops/:id', updateShop);
router.delete('/shops/:id', deleteShop);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.get('/logs', getLogs);
router.post('/owners', createOwner);

module.exports = router;
