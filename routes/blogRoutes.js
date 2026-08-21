const express = require('express');
const router = express.Router();
const {
  getBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog
} = require('../controllers/blogController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getBlogs);
router.get('/:id', getBlogById);

// Admin routes
router.post('/admin', protect, admin, createBlog);
router.put('/admin/:id', protect, admin, updateBlog);
router.delete('/admin/:id', protect, admin, deleteBlog);

module.exports = router;
