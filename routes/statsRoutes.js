const express = require('express');
const router = express.Router();
const {
  getOverviewStats,
  getRentalTrends
} = require('../controllers/statsController');
const { protect, adminOrManager } = require('../middleware/authMiddleware');

router.get('/overview', protect, adminOrManager, getOverviewStats);
router.get('/rental-trends', protect, adminOrManager, getRentalTrends);

module.exports = router;
