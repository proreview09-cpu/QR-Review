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
  regenerateReviews,
  getLogs,
  getAIStatus,
  checkAIStatus,
  getSettings,
  updateSettings,
  createOwner,
  resetOwnerPassword,
  impersonateOwner,
} = require('../controllers/adminController');

router.use(auth(['admin']));

router.get('/dashboard', getDashboard);
router.get('/shops', getShops);
router.post('/shops', createShop);
router.get('/shops/:id', getShop);
router.get('/shops/:id/reviews', getShopReviews);
router.post('/shops/:id/regenerate', regenerateReviews);
router.put('/shops/:id', updateShop);
router.delete('/shops/:id', deleteShop);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.get('/logs', getLogs);
router.get('/ai-status', getAIStatus);
router.post('/ai-status/check', checkAIStatus);
router.post('/owners', createOwner);
router.post('/shops/:id/reset-owner-password', resetOwnerPassword);
router.post('/shops/:id/impersonate', impersonateOwner);

module.exports = router;
