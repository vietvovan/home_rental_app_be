const express = require('express');
const router = express.Router();
const {
  getDeposits,
  createDeposit,
  updateDepositStatus
} = require('../controllers/depositController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/admin', protect, admin, getDeposits);
router.post('/admin', protect, admin, createDeposit);
router.put('/admin/:id/status', protect, admin, updateDepositStatus);

module.exports = router;
