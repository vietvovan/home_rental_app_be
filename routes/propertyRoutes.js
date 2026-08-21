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
const { protect, admin } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getProperties);
router.get('/featured', getFeaturedProperties);
router.get('/:id', getPropertyById);

// Admin routes
router.post('/admin', protect, admin, createProperty);
router.put('/admin/:id', protect, admin, updateProperty);
router.delete('/admin/:id', protect, admin, deleteProperty);

module.exports = router;
