const { Property, User } = require('../models');
const { Op } = require('sequelize');
const { deleteFromCloudinary } = require('../config/cloudinary');
const cache = require('../utils/memCache');

/**
 * Lọc bỏ các trường dữ liệu bảo mật nếu không đủ quyền:
 * - commission: Ẩn với khách vãng lai chưa đăng nhập
 * - exactAddress, zaloGroupUrl: ẨN TUYỆT ĐỐI nếu không phải vai trò Admin hoặc Manager
 */
const filterSensitivePropertyFields = (data, user) => {
  if (!data) return data;
  const userRole = (user?.role || '').toLowerCase();
  const isAdminOrManager = userRole === 'admin' || userRole === 'manager';

  if (!isAdminOrManager) {
    delete data.exactAddress;
    delete data.zaloGroupUrl;
  }

  return data;
};

// @desc    Get all properties
// @route   GET /api/properties
// @access  Public
const getProperties = async (req, res) => {
  try {
    const {
      status, type, minPrice, maxPrice, featured,
      isPublished, search, page, limit
    } = req.query;

    const isStaff = req.user && ['Admin', 'Manager', 'Agent'].includes(req.user.role);

    // Mặc định phân trang: 12 BDS / trang cho public, 20 cho staff
    const pageNum  = Math.max(1, parseInt(page, 10)  || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || (isStaff ? 20 : 12)));
    const offset   = (pageNum - 1) * limitNum;

    // --- Cache key ---
    // Staff bỏ qua cache (dữ liệu thay đổi liên tục, cần real-time)
    const cacheKey = !isStaff
      ? `props:${JSON.stringify({ status, type, minPrice, maxPrice, featured, search, pageNum, limitNum })}`
      : null;

    if (cacheKey) {
      const cached = cache.get(cacheKey);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }
    }

    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (featured === 'true') where.isFeatured = true;

    if (!isStaff) {
      where.isPublished = true;
    } else if (isPublished !== undefined && isPublished !== 'All' && isPublished !== '') {
      where.isPublished = isPublished === 'true';
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = Number(minPrice);
      if (maxPrice) where.price[Op.lte] = Number(maxPrice);
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { title:   { [Op.like]: q } },
        { address: { [Op.like]: q } },
      ];
    }

    const { count, rows } = await Property.findAndCountAll({
      where,
      attributes: { exclude: isStaff ? [] : ['exactAddress', 'zaloGroupUrl'] },
      include: [
        { model: User, as: 'agent', attributes: ['id', 'name', 'email', 'phone'] }
      ],
      order: [['isFeatured', 'DESC'], ['createdAt', 'DESC']],
      limit:    limitNum,
      offset,
      distinct: true,
    });

    const safeProperties = rows.map(p => filterSensitivePropertyFields(p.toJSON(), req.user));

    const result = {
      total:       count,
      totalPages:  Math.ceil(count / limitNum),
      currentPage: pageNum,
      pageSize:    limitNum,
      data:        safeProperties,
    };

    if (cacheKey) {
      cache.set(cacheKey, result, 5 * 60 * 1000); // Cache 5 phút
      res.set('X-Cache', 'MISS');
    }

    return res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get featured properties
// @route   GET /api/properties/featured
// @access  Public
const getFeaturedProperties = async (req, res) => {
  try {
    const CACHE_KEY = 'props:featured';
    const cached = cache.get(CACHE_KEY);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    const properties = await Property.findAll({
      where: {
        isFeatured: true,
        isPublished: true,
        status: { [Op.ne]: 'Đã cho thuê' }
      },
      attributes: { exclude: ['exactAddress', 'zaloGroupUrl'] },
      include: [
        { model: User, as: 'agent', attributes: ['id', 'name', 'email', 'phone', 'role'] }
      ],
      limit: 6,
      order: [['createdAt', 'DESC']]
    });

    const safeProperties = properties.map(p => filterSensitivePropertyFields(p.toJSON(), req.user));

    cache.set(CACHE_KEY, safeProperties, 5 * 60 * 1000);
    res.set('X-Cache', 'MISS');
    return res.json(safeProperties);
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

      const propertyData = filterSensitivePropertyFields(property.toJSON(), req.user);
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

const parseCleanNumber = (val) => {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (/^\d+\.\d{1,2}$/.test(str)) {
    const n = parseFloat(str);
    return isNaN(n) ? 0 : n;
  }
  const digits = str.replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
};

// Helper to sanitize numeric inputs
const sanitizePropertyData = (body) => {
  const data = { ...body };
  if (data.price !== undefined && data.price !== null) {
    const p = parseCleanNumber(data.price);
    data.price = p === null ? 0 : p;
  }
  if (data.deposit !== undefined && data.deposit !== null) {
    const d = parseCleanNumber(data.deposit);
    data.deposit = d === null ? 0 : d;
  }
  if (data.commission !== undefined && data.commission !== null) {
    const c = parseCleanNumber(data.commission);
    data.commission = c === null ? 0 : c;
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
  if (data.exactAddress !== undefined) {
    data.exactAddress = data.exactAddress ? String(data.exactAddress).trim() : null;
  }
  if (data.zaloGroupUrl !== undefined) {
    data.zaloGroupUrl = data.zaloGroupUrl ? String(data.zaloGroupUrl).trim() : null;
  }
  if (data.isFeatured !== undefined) {
    data.isFeatured = Boolean(data.isFeatured);
  }
  if (data.serviceFees !== undefined) {
    if (typeof data.serviceFees === 'string') {
      try {
        data.serviceFees = JSON.parse(data.serviceFees);
      } catch {
        data.serviceFees = null;
      }
    }
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
    // Xóa cache khi có BDS mới
    cache.delByPrefix('props:');
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
      // Xóa cache khi cập nhật BDS
      cache.delByPrefix('props:');
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
    // Xóa cache khi toggle publish
    cache.delByPrefix('props:');
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
      // Xóa cache khi xóa BDS
      cache.delByPrefix('props:');
      res.json({ message: 'Property removed' });
    } else {
      res.status(404).json({ message: 'Property not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Download/proxy image to force file download with proper attachment headers
// @route   GET /api/properties/download-image
// @access  Public
const downloadImageProxy = async (req, res) => {
  try {
    const { url, filename } = req.query;
    if (!url) {
      return res.status(400).json({ message: 'URL is required' });
    }

    const safeFilename = filename || 'anh-bds.jpg';
    const httpModule = url.startsWith('https:') ? require('https') : require('http');

    const handleStream = (targetUrl) => {
      httpModule.get(targetUrl, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          return handleStream(response.headers.location);
        }
        if (response.statusCode !== 200) {
          return res.status(response.statusCode).json({ message: 'Cannot fetch image from source' });
        }

        const contentType = response.headers['content-type'] || 'image/jpeg';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeFilename)}"`);
        res.setHeader('Access-Control-Allow-Origin', '*');
        response.pipe(res);
      }).on('error', (err) => {
        console.error('Error fetching image in download proxy:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Failed to download image' });
        }
      });
    };

    handleStream(url);
  } catch (error) {
    console.error('Error in downloadImageProxy:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: error.message });
    }
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
  downloadImageProxy,
};
