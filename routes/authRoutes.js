const express = require('express');
const router = express.Router();
const { register, login, forgotPassword, changePassword, getMe } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.put('/change-password', protect, changePassword);
router.get('/me', protect, getMe);

module.exports = router;
