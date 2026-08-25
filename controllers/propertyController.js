const { Property, User } = require('../models');
const { Op } = require('sequelize');
const { deleteFromCloudinary } = require('../config/cloudinary');

// @desc    Get all properties
// @route   GET /api/properties
// @access  Public
const getProperties = async (req, res) => {
  try {
    const { status, type, minPrice, maxPrice, featured, isPublished, search, page, limit } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (featured === 'true') where.isFeatured = true;

    // Kiểm tra quyền hạn:
    // - Khách vãng lai / Public: BẮT BUỘC chỉ thấy tin đang bật đăng (isPublished: true)
    // - Nhân viên (Admin/Manager/Agent): Thấy tất cả hoặc có thể lọc theo isPublished
    const isStaff = req.user && ['Admin', 'Manager', 'Agent'].includes(req.user.role);
    if (!isStaff) {
      where.isPublished = true;
    } else if (isPublished !== undefined && isPublished !== 'All' && isPublished !== '') {
      where.isPublished = isPublished === 'true';
    }
    
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = minPrice;
      if (maxPrice) where.price[Op.lte] = maxPrice;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { address: { [Op.like]: `%${search}%` } },
      ];
    }

    const queryOptions = {
      where,
      include: [
        { model: User, as: 'agent', attributes: ['id', 'name', 'email', 'phone'] }
      ],
      order: [['createdAt', 'DESC']]
    };

    if (page && limit) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const offset = (pageNum - 1) * limitNum;

      const { count, rows } = await Property.findAndCountAll({
        ...queryOptions,
        limit: limitNum,
        offset,
        distinct: true
      });

      const safeProperties = rows.map(p => {
        const data = p.toJSON();
        if (!req.user) delete data.commission;
        return data;
      });

      return res.json({
        total: count,
        totalPages: Math.ceil(count / limitNum),
        currentPage: pageNum,
        data: safeProperties
      });
    }

    const properties = await Property.findAll(queryOptions);

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
      where: {
        isFeatured: true,
        isPublished: true,
        status: { [Op.ne]: 'Đã cho thuê' }
      },
      include: [
        { model: User, as: 'agent', attributes: ['id', 'name', 'email', 'phone', 'role'] }
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
        { model: User, as: 'agent', attributes: ['id', 'name', 'email', 'phone', 'role'] }
      ]
    });

    if (property) {
      const isStaff = req.user && ['Admin', 'Manager', 'Agent'].includes(req.user.role);
      if (!isStaff && property.isPublished === false) {
        return res.status(404).json({ message: 'Bất động sản này hiện đang tạm dừng đăng tin' });
      }

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

// Helper to sanitize numeric inputs
const sanitizePropertyData = (body) => {
  const data = { ...body };
  if (data.price !== undefined && data.price !== null) {
    const p = Number(String(data.price).replace(/[^0-9.]/g, ''));
    data.price = isNaN(p) ? 0 : p;
  }
  if (data.deposit !== undefined && data.deposit !== null) {
    const d = Number(String(data.deposit).replace(/[^0-9.]/g, ''));
    data.deposit = isNaN(d) ? 0 : d;
  }
  if (data.commission !== undefined && data.commission !== null) {
    const c = Number(String(data.commission).replace(/[^0-9.]/g, ''));
    data.commission = isNaN(c) ? 0 : c;
  }
  if (data.area !== undefined && data.area !== null) {
    const a = Number(String(data.area).replace(/[^0-9.]/g, ''));
    data.area = isNaN(a) ? 0 : a;
  }
  if (data.frontage !== undefined && data.frontage !== null) {
    const f = Number(String(data.frontage).replace(/[^0-9.]/g, ''));
    data.frontage = isNaN(f) || f === 0 ? null : f;
  }
  if (data.length !== undefined && data.length !== null) {
    const l = Number(String(data.length).replace(/[^0-9.]/g, ''));
    data.length = isNaN(l) || l === 0 ? null : l;
  }
  if (data.width !== undefined && data.width !== null) {
    const w = Number(String(data.width).replace(/[^0-9.]/g, ''));
    data.width = isNaN(w) || w === 0 ? null : w;
  }
  if (data.floors !== undefined && data.floors !== null) {
    const fl = parseInt(String(data.floors).replace(/\D/g, ''), 10);
    data.floors = isNaN(fl) || fl === 0 ? null : fl;
  }
  return data;
};

// @desc    Create new property
// @route   POST /api/properties/admin
// @access  Private/Admin
const createProperty = async (req, res) => {
  try {
    const cleanData = sanitizePropertyData(req.body);
    const data = {
      ...cleanData,
      // Tự động gán agentId là người đăng tin nếu không truyền
      agentId: cleanData.agentId || (req.user ? req.user.id : null),
      // Mặc định khi thêm mới BĐS thì bật tính năng đăng tin
      isPublished: cleanData.isPublished !== undefined ? Boolean(cleanData.isPublished) : true,
    };
    const property = await Property.create(data);
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
      const cleanData = sanitizePropertyData(req.body);
      // Nếu ảnh bìa được thay thế → xóa ảnh cũ trên Cloudinary
      if (cleanData.image && cleanData.image !== property.image) {
        await deleteFromCloudinary(property.image);
      }
      const updatedProperty = await property.update(cleanData);
      res.json(updatedProperty);
    } else {
      res.status(404).json({ message: 'Property not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle publish status
// @route   PATCH /api/properties/admin/:id/toggle-publish
// @access  Private/Admin
const togglePublishProperty = async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Không tìm thấy bất động sản' });
    }
    const newStatus = property.isPublished === false ? true : false;
    await property.update({ isPublished: newStatus });
    res.json({
      success: true,
      message: newStatus ? 'Đã bật đăng tin BĐS thành công' : 'Đã tắt đăng tin BĐS thành công',
      property,
    });
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
  togglePublishProperty,
  deleteProperty,
};
