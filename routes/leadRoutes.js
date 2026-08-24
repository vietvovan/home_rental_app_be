const express = require('express');
const router = express.Router();
const {
  createLead,
  getLeads,
  getPublicLeadActivity,
  getLeadById,
  updateLead,
  deleteLead
} = require('../controllers/leadController');
const { protect, anyStaff } = require('../middlewares/authMiddleware');

// Public route for form submission and shared activity link
router.post('/', createLead);
router.get('/public/:id', getPublicLeadActivity);

// Admin routes for managing leads (Admin/Manager/Agent)
router.get('/admin', protect, anyStaff, getLeads);
router.get('/admin/:id', protect, anyStaff, getLeadById);
router.put('/admin/:id', protect, anyStaff, updateLead);
router.delete('/admin/:id', protect, anyStaff, deleteLead);

module.exports = router;
