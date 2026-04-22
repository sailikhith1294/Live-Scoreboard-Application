const express = require('express');
const {
	signup,
	login,
	me,
	requestSignupOtp,
	verifySignupOtp,
	requestLoginOtp,
	verifyLoginOtp,
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/signup/otp/request', requestSignupOtp);
router.post('/signup/otp/verify', verifySignupOtp);
router.post('/login/otp/request', requestLoginOtp);
router.post('/login/otp/verify', verifyLoginOtp);
router.get('/me', authenticate, me);

module.exports = router;
