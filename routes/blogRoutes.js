const express = require('express');
const router = express.Router();
const {
  getBlogs,
  getBlogById,
  uploadBlogImage,
  createBlog,
  updateBlog,
  deleteBlog
} = require('../controllers/blogController');
const { uploadBlog } = require('../config/cloudinary');
const { protect, adminOrManager } = require('../middlewares/authMiddleware');

// Public routes
router.get('/', getBlogs);
router.get('/:id', getBlogById);

// Admin routes
// Upload 1 ảnh bìa blog lên Cloudinary
router.post('/upload-image', protect, adminOrManager, uploadBlog.single('image'), uploadBlogImage);
router.post('/admin', protect, adminOrManager, createBlog);
router.put('/admin/:id', protect, adminOrManager, updateBlog);
router.delete('/admin/:id', protect, adminOrManager, deleteBlog);

module.exports = router;
