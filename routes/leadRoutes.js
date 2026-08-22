const express = require('express');
const router = express.Router();
const {
  createLead,
  getLeads,
  getLeadById,
  updateLead
} = require('../controllers/leadController');
const { protect, anyStaff } = require('../middleware/authMiddleware');

// Public route for form submission
router.post('/', createLead);

// Admin routes for managing leads (Admin/Manager/Agent)
router.get('/admin', protect, anyStaff, getLeads);
router.get('/admin/:id', protect, anyStaff, getLeadById);
router.put('/admin/:id', protect, anyStaff, updateLead);
router.delete('/admin/:id', protect, anyStaff, require('../controllers/leadController').deleteLead);

module.exports = router;
