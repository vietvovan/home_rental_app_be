const express = require('express');
const router = express.Router();
const {
  createLead,
  getLeads,
  getLeadById,
  updateLead
} = require('../controllers/leadController');
const { protect } = require('../middleware/authMiddleware');

// Public route for form submission
router.post('/', createLead);

// Admin routes for managing leads
router.get('/admin', protect, getLeads);
router.get('/admin/:id', protect, getLeadById);
router.put('/admin/:id', protect, updateLead);

module.exports = router;
