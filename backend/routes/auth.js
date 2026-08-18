const router = require('express').Router();
const { login, register, googleLogin, getMe } = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/register', register);
router.post('/google', googleLogin);
router.post('/login', login);
router.get('/me', auth(), getMe);

module.exports = router;