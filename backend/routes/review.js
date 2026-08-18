const router = require('express').Router();
const { getShopPublic, copyReview, generateMore, markPosted, getActiveCategories, googleAutocomplete, googlePlaceLookup, getPublicConfig } = require('../controllers/reviewController');

router.get('/config', getPublicConfig);
router.get('/categories', getActiveCategories);
router.post('/places/autocomplete', googleAutocomplete);
router.post('/places/lookup', googlePlaceLookup);
router.get('/shop/:shopId', getShopPublic);
router.post('/review/:reviewId/copy', copyReview);
router.post('/review/:reviewId/posted', markPosted);
router.post('/shop/:shopId/generate', generateMore);

module.exports = router;
