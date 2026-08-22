const express = require('express');
const router = express.Router();
const {
  getProperties,
  getFeaturedProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty
} = require('../controllers/propertyController');
const { protect, optionalProtect, adminOrManager } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getProperties);
router.get('/featured', getFeaturedProperties);
router.get('/:id', optionalProtect, getPropertyById);

// Admin routes
router.post('/admin', protect, adminOrManager, createProperty);
router.put('/admin/:id', protect, adminOrManager, updateProperty);
router.delete('/admin/:id', protect, adminOrManager, deleteProperty);

module.exports = router;
