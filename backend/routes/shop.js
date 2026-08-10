const router = require('express').Router();
const auth = require('../middleware/auth');
const { getMyShop, updateMyShop, getShopStats } = require('../controllers/shopController');

router.use(auth(['shop_owner']));

router.get('/my-shop', getMyShop);
router.put('/my-shop', updateMyShop);
router.get('/stats', getShopStats);

module.exports = router;
