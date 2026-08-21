const express = require('express');
const router = express.Router();
const {
  getOverviewStats,
  getRentalTrends
} = require('../controllers/statsController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/overview', protect, admin, getOverviewStats);
router.get('/rental-trends', protect, admin, getRentalTrends);

module.exports = router;
