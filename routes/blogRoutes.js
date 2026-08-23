const express = require('express');
const router = express.Router();
const {
  getBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog
} = require('../controllers/blogController');
const { protect, adminOrManager } = require('../middlewares/authMiddleware');

// Public routes
router.get('/', getBlogs);
router.get('/:id', getBlogById);

// Admin routes
router.post('/admin', protect, adminOrManager, createBlog);
router.put('/admin/:id', protect, adminOrManager, updateBlog);
router.delete('/admin/:id', protect, adminOrManager, deleteBlog);

module.exports = router;
