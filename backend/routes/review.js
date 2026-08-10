const router = require('express').Router();
const { getShopPublic, copyReview, generateMore, markPosted } = require('../controllers/reviewController');

router.get('/shop/:shopId', getShopPublic);
router.post('/review/:reviewId/copy', copyReview);
router.post('/review/:reviewId/posted', markPosted);
router.post('/shop/:shopId/generate', generateMore);

module.exports = router;
