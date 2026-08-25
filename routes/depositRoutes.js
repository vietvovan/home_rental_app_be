const express = require('express');
const router = express.Router();
const {
  getDeposits,
  createDeposit,
  updateDepositStatus
} = require('../controllers/depositController');
const { protect, adminOrManager } = require('../middlewares/authMiddleware');

router.get('/', protect, getDeposits);
router.get('/admin', protect, getDeposits);
router.post('/admin', protect, adminOrManager, createDeposit);
router.put('/admin/:id/status', protect, adminOrManager, updateDepositStatus);

module.exports = router;
