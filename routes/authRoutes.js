const express = require('express');
const router = express.Router();

const { register, login, getMe, getOrganizationUsers } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const { loginLimiter, registerLimiter } = require('../middlewares/rateLimit');

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.get('/me', protect, getMe);
router.get('/users', protect, getOrganizationUsers);

module.exports = router;
