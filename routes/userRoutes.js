const express = require('express');
const router = express.Router();
const {
  getUsers,
  createUser,
  updateUser,
  updateUserStatus
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/admin', protect, admin, getUsers);
router.post('/admin', protect, admin, createUser);
router.put('/admin/:id', protect, admin, updateUser);
router.put('/admin/:id/status', protect, admin, updateUserStatus);

module.exports = router;
