const { BlogPost, User } = require('../models');
const { deleteFromCloudinary } = require('../config/cloudinary');

// @desc    Get all blog posts
// @route   GET /api/blogs
// @access  Public
const getBlogs = async (req, res) => {
  try {
    const blogs = await BlogPost.findAll({
      include: [
        { model: User, as: 'author', attributes: ['id', 'name'] }
      ],
      order: [['publishedAt', 'DESC']]
    });
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single blog post
// @route   GET /api/blogs/:id
// @access  Public
const getBlogById = async (req, res) => {
  try {
    const blog = await BlogPost.findByPk(req.params.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'name'] }
      ]
    });

    if (blog) {
      res.json(blog);
    } else {
      res.status(404).json({ message: 'Blog post not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload ảnh bìa Blog lên Cloudinary
// @route   POST /api/blogs/upload-image
// @access  Private/Admin
const uploadBlogImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng chọn ảnh bìa' });
    }
    res.json({
      success: true,
      url: req.file.path,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new blog post
// @route   POST /api/blogs/admin
// @access  Private/Admin
const createBlog = async (req, res) => {
  try {
    const newBlog = { ...req.body, authorId: req.user.id };
    const blog = await BlogPost.create(newBlog);
    res.status(201).json(blog);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update blog post
// @route   PUT /api/blogs/admin/:id
// @access  Private/Admin
const updateBlog = async (req, res) => {
  try {
    const blog = await BlogPost.findByPk(req.params.id);

    if (blog) {
      // Nếu ảnh bìa được thay thế → xóa ảnh cũ trên Cloudinary
      if (req.body.image && req.body.image !== blog.image) {
        await deleteFromCloudinary(blog.image);
      }
      const updatedBlog = await blog.update(req.body);
      res.json(updatedBlog);
    } else {
      res.status(404).json({ message: 'Blog post not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete blog post
// @route   DELETE /api/blogs/admin/:id
// @access  Private/Admin
const deleteBlog = async (req, res) => {
  try {
    const blog = await BlogPost.findByPk(req.params.id);

    if (blog) {
      // Xóa ảnh bìa trên Cloudinary trước khi xóa record
      await deleteFromCloudinary(blog.image);
      await blog.destroy();
      res.json({ message: 'Blog post removed' });
    } else {
      res.status(404).json({ message: 'Blog post not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getBlogs,
  getBlogById,
  uploadBlogImage,
  createBlog,
  updateBlog,
  deleteBlog,
};
