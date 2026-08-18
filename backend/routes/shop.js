const router = require('express').Router();
const auth = require('../middleware/auth');
const { getMyShop, createMyShop, updateMyShop, getShopStats, getMyShopReviews, getMyNotifications, markNotificationsRead } = require('../controllers/shopController');

router.use(auth(['shop_owner']));

router.get('/my-shop', getMyShop);
router.post('/my-shop', createMyShop);
router.put('/my-shop', updateMyShop);
router.get('/stats', getShopStats);
router.get('/reviews', getMyShopReviews);
router.get('/notifications', getMyNotifications);
router.post('/notifications/read', markNotificationsRead);

module.exports = router;
