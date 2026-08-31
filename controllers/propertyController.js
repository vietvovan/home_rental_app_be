const { Property, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const { deleteFromCloudinary } = require('../config/cloudinary');
const cache = require('../utils/memCache');

/**
 * Lọc bỏ các trường dữ liệu bảo mật nếu không đủ quyền:
 * - commission: ẨN nếu không phải vai trò Admin hoặc Manager
 * - exactAddress, zaloGroupUrl: ẨN TUYỆT ĐỐI nếu không phải vai trò Admin hoặc Manager
 */
const filterSensitivePropertyFields = (data, user) => {
  if (!data) return data;
  const userRole = (user?.role || '').toLowerCase();
  const isAdminOrManager = userRole === 'admin' || userRole === 'manager';

  if (!isAdminOrManager) {
    delete data.exactAddress;
    delete data.zaloGroupUrl;
    delete data.commission;
  }

  return data;
};

const normalizeText = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .trim();
};

/**
 * Xây dựng điều kiện lọc địa chỉ thông minh - Hỗ trợ:
 * - Không phân biệt dấu tiếng Việt: "lac long quan" khớp "Lạc Long Quân"
 * - Không phân biệt chữ hoa/thường: "CAU GIAY" khớp "Cầu Giấy"
 *
 * Chiến lược:
 * - Tìm trong cột `address` (raw): khớp khi người dùng gõ đúng dấu
 * - Tìm trong cột `normalizedAddress` (không dấu): khớp khi gõ không dấu
 *   normalizedAddress được tự động sinh khi lưu/sửa BĐS và được backfill khi server khởi động
 */
const buildAddressConditions = ({ search, province, district, isStaff }) => {
  const andConditions = [];

  // Helper: tạo OR giữa raw address (có dấu) và normalizedAddress (không dấu, không hoa thường)
  const addressLike = (rawKeyword) => {
    const normKeyword = normalizeText(rawKeyword); // chuyển sang không dấu, viết thường
    const conditions = [
      { address: { [Op.like]: `%${rawKeyword}%` } },           // khớp địa chỉ gốc
      { normalizedAddress: { [Op.like]: `%${normKeyword}%` } } // khớp địa chỉ không dấu
    ];
    return { [Op.or]: conditions };
  };

  // 1. Lọc theo Tỉnh / Thành phố
  if (province && typeof province === 'string' && province.trim() && province !== 'Tất cả tỉnh/thành') {
    const prov = province.trim();
    const normProv = normalizeText(prov);
    let keywords = [];

    if (/ho chi minh|tp\.?hcm|hcm|sai gon/.test(normProv)) {
      keywords = ['Hồ Chí Minh', 'TP.HCM', 'TP. Hồ Chí Minh', 'Sài Gòn'];
    } else if (/ha noi|^hn$/.test(normProv)) {
      keywords = ['Hà Nội'];
    } else if (/da nang|^dn$/.test(normProv)) {
      keywords = ['Đà Nẵng'];
    } else if (/hai phong|^hp$/.test(normProv)) {
      keywords = ['Hải Phòng'];
    } else if (/hung yen|^hy$/.test(normProv)) {
      keywords = ['Hưng Yên'];
    } else {
      keywords = [prov];
    }

    andConditions.push({
      [Op.or]: keywords.flatMap(k => [
        { address: { [Op.like]: `%${k}%` } },
        { normalizedAddress: { [Op.like]: `%${normalizeText(k)}%` } }
      ])
    });
  }

  // 2. Lọc theo Quận / Huyện
  if (district && typeof district === 'string' && district.trim() && district !== 'Tất cả quận/huyện') {
    const rawDist = district.trim();
    const cleanDist = rawDist.replace(/^(Quận|Huyện|Thị xã|Thành phố|TP\.)\s+/i, '').trim();
    const numMatch = rawDist.match(/^(?:quận|quan|q\.?|huyện|huyen)\s*(\d{1,2})$/i);

    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      andConditions.push({
        [Op.or]: [
          { address: { [Op.like]: `%Quận ${num}%` } },
          { address: { [Op.like]: `%Q.${num}%` } },
          { address: { [Op.like]: `%Q${num}%` } },
          { normalizedAddress: { [Op.like]: `%quan ${num}%` } },
          { normalizedAddress: { [Op.like]: `%q.${num}%` } },
          { normalizedAddress: { [Op.like]: `%q${num}%` } },
          { normalizedAddress: { [Op.like]: `%quan 0${num}%` } },
        ]
      });
    } else {
      const orConditions = [
        { address: { [Op.like]: `%${rawDist}%` } },
        { normalizedAddress: { [Op.like]: `%${normalizeText(rawDist)}%` } }
      ];
      if (cleanDist && cleanDist !== rawDist) {
        orConditions.push(
          { address: { [Op.like]: `%${cleanDist}%` } },
          { normalizedAddress: { [Op.like]: `%${normalizeText(cleanDist)}%` } }
        );
      }
      andConditions.push({ [Op.or]: orConditions });
    }
  }

  // 3. Tìm kiếm theo từ khóa địa chỉ (hỗ trợ có dấu, không dấu, chữ hoa, chữ thường)
  if (search && typeof search === 'string' && search.trim()) {
    const rawSearch = search.trim();
    const normSearch = normalizeText(rawSearch);
    const cleanRaw = rawSearch.replace(/^(Quận|Huyện|Thị xã|Thành phố|Tỉnh|TP\.|P\.|Phường|Đường|Phố)\s+/i, '').trim();
    const cleanNorm = normalizeText(cleanRaw);

    const searchOr = [
      { address: { [Op.like]: `%${rawSearch}%` } },
      { normalizedAddress: { [Op.like]: `%${normSearch}%` } },
    ];

    if (cleanRaw && cleanRaw !== rawSearch) {
      searchOr.push(
        { address: { [Op.like]: `%${cleanRaw}%` } },
        { normalizedAddress: { [Op.like]: `%${cleanNorm}%` } }
      );
    }

    // Xử lý quận đánh số
    const numMatch = rawSearch.match(/^(?:quận|quan|q\.?|huyện|huyen)\s*(\d{1,2})$/i);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      searchOr.push(
        { address: { [Op.like]: `%Quận ${num}%` } },
        { address: { [Op.like]: `%Q.${num}%` } },
        { address: { [Op.like]: `%Q${num}%` } },
        { normalizedAddress: { [Op.like]: `%quan ${num}%` } },
        { normalizedAddress: { [Op.like]: `%q.${num}%` } },
        { normalizedAddress: { [Op.like]: `%q${num}%` } }
      );
    }

    // Tìm thêm trong exactAddress cho Staff/Admin
    if (isStaff) {
      searchOr.push(
        { exactAddress: { [Op.like]: `%${rawSearch}%` } },
        { normalizedExactAddress: { [Op.like]: `%${normSearch}%` } }
      );
      if (cleanRaw && cleanRaw !== rawSearch) {
        searchOr.push(
          { exactAddress: { [Op.like]: `%${cleanRaw}%` } },
          { normalizedExactAddress: { [Op.like]: `%${cleanNorm}%` } }
        );
      }
    }

    andConditions.push({ [Op.or]: searchOr });
  }

  return andConditions;
};

// @desc    Get all properties
// @route   GET /api/properties
// @access  Public
const getProperties = async (req, res) => {
  try {
    const {
      status, type, minPrice, maxPrice, featured,
      isPublished, search, province, district, page, limit
    } = req.query;

    const userRole = (req.user?.role || '').toLowerCase();
    const isAdminOrManager = userRole === 'admin' || userRole === 'manager';
    const isStaff = req.user && ['Admin', 'Manager', 'Agent'].includes(req.user.role);

    // Mặc định phân trang: 12 BDS / trang cho public, 20 cho staff
    const pageNum  = Math.max(1, parseInt(page, 10)  || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || (isStaff ? 20 : 12)));
    const offset   = (pageNum - 1) * limitNum;

    // --- Cache key ---
    // Staff/Admin bỏ qua cache (dữ liệu thay đổi liên tục, cần real-time)
    const cacheKey = !isStaff
      ? `props:${JSON.stringify({ status, type, minPrice, maxPrice, featured, search, province, district, pageNum, limitNum })}`
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

    // Áp dụng bộ lọc địa chỉ: Tỉnh/Thành + Quận/Huyện + Từ khóa ô tìm kiếm (chỉ tìm trong address)
    const addressConditions = buildAddressConditions({ search, province, district, isStaff });
    if (addressConditions.length === 1) {
      Object.assign(where, addressConditions[0]);
    } else if (addressConditions.length > 1) {
      where[Op.and] = addressConditions;
    }

    const { count, rows } = await Property.findAndCountAll({
      where,
      attributes: { exclude: isAdminOrManager ? [] : ['exactAddress', 'zaloGroupUrl', 'commission'] },
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
    const userRole = (req.user?.role || '').toLowerCase();
    const isAdminOrManager = userRole === 'admin' || userRole === 'manager';
    const CACHE_KEY = !isAdminOrManager ? 'props:featured' : null;

    if (CACHE_KEY) {
      const cached = cache.get(CACHE_KEY);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }
    }

    const properties = await Property.findAll({
      where: {
        isFeatured: true,
        isPublished: true,
        status: { [Op.ne]: 'Đã cho thuê' }
      },
      attributes: { exclude: isAdminOrManager ? [] : ['exactAddress', 'zaloGroupUrl', 'commission'] },
      include: [
        { model: User, as: 'agent', attributes: ['id', 'name', 'email', 'phone', 'role'] }
      ],
      limit: 6,
      order: [['createdAt', 'DESC']]
    });

    const safeProperties = properties.map(p => filterSensitivePropertyFields(p.toJSON(), req.user));

    if (CACHE_KEY) {
      cache.set(CACHE_KEY, safeProperties, 5 * 60 * 1000);
      res.set('X-Cache', 'MISS');
    }
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
  if (data.address !== undefined) {
    data.address = data.address ? String(data.address).trim() : '';
    data.normalizedAddress = normalizeText(data.address);
  }
  if (data.exactAddress !== undefined) {
    data.exactAddress = data.exactAddress ? String(data.exactAddress).trim() : null;
    data.normalizedExactAddress = data.exactAddress ? normalizeText(data.exactAddress) : null;
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
    const userRole = (req.user?.role || '').toLowerCase();
    const isAdmin = userRole === 'admin';

    const data = {
      ...cleanData,
      // Chỉ role Admin mới được phép gán BĐS Nổi Bật
      isFeatured: isAdmin ? Boolean(cleanData.isFeatured) : false,
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
      const userRole = (req.user?.role || '').toLowerCase();
      const isAdmin = userRole === 'admin';

      // Nếu không phải Admin thì không được thay đổi trạng thái BĐS Nổi Bật
      if (!isAdmin && cleanData.isFeatured !== undefined) {
        delete cleanData.isFeatured;
      }

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

// @desc    Backfill normalizedAddress cho tất cả BĐS (dùng khi mới thêm cột)
// @route   POST /api/properties/admin/backfill-address
// @access  Private/Admin
const backfillNormalizedAddress = async (req, res) => {
  try {
    const [tablesResult] = await sequelize.query('SHOW TABLES');
    const propTable = tablesResult.map(r => Object.values(r)[0]).find(t => t.toLowerCase() === 'properties');
    if (!propTable) return res.status(404).json({ message: 'Bảng Properties không tồn tại' });

    const [props] = await sequelize.query(
      `SELECT id, address, exactAddress FROM \`${propTable}\` WHERE normalizedAddress IS NULL OR normalizedAddress = ''`
    );

    if (props.length === 0) {
      return res.json({ message: 'Tất cả BĐS đã có normalizedAddress', updated: 0 });
    }

    let updated = 0;
    for (const row of props) {
      const normAddr = normalizeText(row.address || '');
      const normExact = normalizeText(row.exactAddress || '');
      await sequelize.query(
        `UPDATE \`${propTable}\` SET normalizedAddress = :normAddr, normalizedExactAddress = :normExact WHERE id = :id`,
        { replacements: { normAddr, normExact, id: row.id } }
      );
      updated++;
    }

    res.json({ message: `Đã backfill normalizedAddress cho ${updated} BĐS`, updated });
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
  downloadImageProxy,
  backfillNormalizedAddress,
};
