const express = require('express');
const router = express.Router();
const {
  getProperties,
  getFeaturedProperties,
  getPropertyById,
  uploadPropertyImages,
  createProperty,
  updateProperty,
  togglePublishProperty,
  deleteProperty,
  downloadImageProxy,
  backfillNormalizedAddress,
  deleteImages,
} = require('../controllers/propertyController');
const { uploadProperty } = require('../config/cloudinary');
const { protect, optionalProtect, adminOrManager } = require('../middlewares/authMiddleware');

// Public routes
router.get('/', optionalProtect, getProperties);
router.get('/featured', optionalProtect, getFeaturedProperties);
router.get('/download-image', downloadImageProxy);

// Admin routes
router.get('/admin', protect, adminOrManager, getProperties);
router.get('/:id', optionalProtect, getPropertyById);

// Admin routes
// Upload tối đa 20 ảnh cùng lúc lên Cloudinary
router.post('/upload-images', protect, adminOrManager, uploadProperty.array('images', 20), uploadPropertyImages);
router.post('/admin', protect, adminOrManager, createProperty);
router.post('/admin/backfill-address', protect, adminOrManager, backfillNormalizedAddress);
router.put('/admin/:id', protect, adminOrManager, updateProperty);
router.patch('/admin/:id/toggle-publish', protect, adminOrManager, togglePublishProperty);
router.delete('/admin/:id', protect, adminOrManager, deleteProperty);
// Xóa hàng loạt ảnh khỏi Cloudinary (gọi sau khi user xóa ảnh trong UI)
router.delete('/images', protect, adminOrManager, deleteImages);

module.exports = router;
