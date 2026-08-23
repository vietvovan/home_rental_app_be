const express = require('express');
const router = express.Router();
const {
  getOverviewStats,
  getRentalTrends
} = require('../controllers/statsController');
const { protect, adminOrManager } = require('../middlewares/authMiddleware');

router.get('/overview', protect, adminOrManager, getOverviewStats);
router.get('/rental-trends', protect, adminOrManager, getRentalTrends);

module.exports = router;
