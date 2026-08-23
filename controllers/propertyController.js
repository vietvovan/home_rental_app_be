const { Property, User } = require('../models');
const { Op } = require('sequelize');
const { deleteFromCloudinary } = require('../config/cloudinary');

// @desc    Get all properties
// @route   GET /api/properties
// @access  Public
const getProperties = async (req, res) => {
  try {
    const { status, type, minPrice, maxPrice, featured } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (featured === 'true') where.isFeatured = true;
    
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = minPrice;
      if (maxPrice) where.price[Op.lte] = maxPrice;
    }

    const properties = await Property.findAll({
      where,
      include: [
        { model: User, as: 'agent', attributes: ['id', 'name', 'email', 'phone'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const safeProperties = properties.map(p => {
      const data = p.toJSON();
      if (!req.user) delete data.commission;
      return data;
    });

    res.json(safeProperties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get featured properties
// @route   GET /api/properties/featured
// @access  Public
const getFeaturedProperties = async (req, res) => {
  try {
    const properties = await Property.findAll({
      where: { isFeatured: true },
      include: [
        { model: User, as: 'agent', attributes: ['id', 'name', 'email', 'phone'] }
      ],
      limit: 6,
      order: [['createdAt', 'DESC']]
    });

    const safeProperties = properties.map(p => {
      const data = p.toJSON();
      if (!req.user) delete data.commission;
      return data;
    });

    res.json(safeProperties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single property
// @route   GET /api/properties/:id
// @access  Public
const getPropertyById = async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id, {
      include: [
        { model: User, as: 'agent', attributes: ['id', 'name', 'email', 'phone'] }
      ]
    });

    if (property) {
      const propertyData = property.toJSON();
      if (!req.user) delete propertyData.commission;
      res.json(propertyData);
    } else {
      res.status(404).json({ message: 'Property not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload images to Cloudinary
// @route   POST /api/properties/upload-images
// @access  Private/Admin
const uploadPropertyImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Vui lòng chọn ít nhất 1 ảnh' });
    }

    // Lấy danh sách URL ảnh đã được upload lên Cloudinary bởi multer-storage-cloudinary
    const imageUrls = req.files.map(file => file.path);

    res.json({
      success: true,
      urls: imageUrls,
      count: imageUrls.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new property
// @route   POST /api/properties/admin
// @access  Private/Admin
const createProperty = async (req, res) => {
  try {
    const property = await Property.create(req.body);
    res.status(201).json(property);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update property
// @route   PUT /api/properties/admin/:id
// @access  Private/Admin
const updateProperty = async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id);

    if (property) {
      // Nếu ảnh bìa được thay thế → xóa ảnh cũ trên Cloudinary
      if (req.body.image && req.body.image !== property.image) {
        await deleteFromCloudinary(property.image);
      }
      const updatedProperty = await property.update(req.body);
      res.json(updatedProperty);
    } else {
      res.status(404).json({ message: 'Property not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete property
// @route   DELETE /api/properties/admin/:id
// @access  Private/Admin
const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id);

    if (property) {
      // Xóa ảnh trên Cloudinary trước khi xóa record
      await deleteFromCloudinary(property.image);
      await property.destroy();
      res.json({ message: 'Property removed' });
    } else {
      res.status(404).json({ message: 'Property not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProperties,
  getFeaturedProperties,
  getPropertyById,
  uploadPropertyImages,
  createProperty,
  updateProperty,
  deleteProperty,
};
