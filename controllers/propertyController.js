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
    .replace(/[đĐ]/g, (c) => c === 'đ' ? 'd' : 'D') // Phải xử lý đ/Đ TRƯỚC khi NFD
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Xóa toàn bộ combining diacritics
    .toLowerCase()
    .trim();
};

/**
 * Xây dựng điều kiện lọc địa chỉ - Tối ưu hiệu suất:
 * - Ưu tiên tìm trong `normalizedAddress` (1 LIKE, có thể dùng index)
 * - Fallback tìm trong `address` gốc (nếu normalizedAddress chưa được backfill / NULL)
 * - normalizedAddress cover cả có dấu/không dấu/hoa/thường
 */
const buildAddressConditions = ({ search, province, district, isStaff }) => {
  const andConditions = [];

  // Helper: tìm trong normalizedAddress (có dấu/không dấu) VÀ fallback address gốc
  // normalizedAddress IS NULL xảy ra khi chưa backfill, fallback LIKE trên address đảm bảo không bỏ sót
  const addrLike = (rawKeyword) => {
    const norm = normalizeText(rawKeyword);
    return [
      { normalizedAddress: { [Op.like]: `%${norm}%` } },
      // Fallback: khi normalizedAddress chưa có dữ liệu, vẫn tìm được trong address gốc
      {
        [Op.and]: [
          { normalizedAddress: null },
          { address: { [Op.like]: `%${rawKeyword}%` } }
        ]
      }
    ];
  };

  // 1. Lọc theo Tỉnh / Thành phố
  if (province && typeof province === 'string' && province.trim() && province !== 'T\u1ea5t c\u1ea3 t\u1ec9nh/th\u00e0nh') {
    const normProv = normalizeText(province.trim());
    let rawKeywords;

    if (/ho chi minh|tp\.?hcm|hcm|sai gon/.test(normProv)) {
      rawKeywords = ['Hồ Chí Minh', 'TP.HCM', 'Sài Gòn'];
    } else if (/ha noi|^hn$/.test(normProv)) {
      rawKeywords = ['Hà Nội'];
    } else if (/da nang|^dn$/.test(normProv)) {
      rawKeywords = ['Đà Nẵng'];
    } else if (/hai phong|^hp$/.test(normProv)) {
      rawKeywords = ['Hải Phòng'];
    } else if (/hung yen|^hy$/.test(normProv)) {
      rawKeywords = ['Hưng Yên'];
    } else {
      rawKeywords = [province.trim()];
    }

    andConditions.push({
      [Op.or]: rawKeywords.flatMap(k => addrLike(k))
    });
  }

  // 2. Lọc theo Quận / Huyện
  if (district && typeof district === 'string' && district.trim() && district !== 'Tất cả quận/huyện') {
    const rawDist = district.trim();
    const numMatch = rawDist.match(/^(?:quận|quan|q\.?|huyện|huyen)\s*(\d{1,2})$/i);

    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      andConditions.push({
        [Op.or]: [
          { normalizedAddress: { [Op.like]: `%quan ${num}%` } },
          { normalizedAddress: { [Op.like]: `%quan 0${num}%` } },
          // Fallback cho records chưa backfill
          { [Op.and]: [{ normalizedAddress: null }, { address: { [Op.like]: `%Quận ${num}%` } }] },
          { [Op.and]: [{ normalizedAddress: null }, { address: { [Op.like]: `%Q.${num}%` } }] },
        ]
      });
    } else {
      const normDist = normalizeText(rawDist);
      const cleanNorm = normDist.replace(/^(quan|huyen|thi xa|thanh pho|tp\.)\s+/i, '').trim();
      const cleanRaw = rawDist.replace(/^(Quận|Huyện|Thị xã|Thành phố|TP\.)\s+/i, '').trim();

      const orConds = [
        { normalizedAddress: { [Op.like]: `%${normDist}%` } },
        // Fallback
        { [Op.and]: [{ normalizedAddress: null }, { address: { [Op.like]: `%${rawDist}%` } }] }
      ];
      if (cleanNorm && cleanNorm !== normDist) {
        orConds.push({ normalizedAddress: { [Op.like]: `%${cleanNorm}%` } });
        if (cleanRaw !== rawDist) {
          orConds.push({ [Op.and]: [{ normalizedAddress: null }, { address: { [Op.like]: `%${cleanRaw}%` } }] });
        }
      }
      andConditions.push({ [Op.or]: orConds });
    }
  }

  // 3. Tìm kiếm từ khóa địa chỉ (không phân biệt dấu, hoa/thường)
  // Bỏ qua nếu < 2 ký tự (tránh full table scan với wildcard ngắn)
  if (search && typeof search === 'string' && search.trim().length >= 2) {
    const rawSearch = search.trim();
    const normSearch = normalizeText(rawSearch);

    // Xử lý quận đánh số (q1, quan 1)
    const numMatch = rawSearch.match(/^(?:quận|quan|q\.?|huyện|huyen)\s*(\d{1,2})$/i);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      andConditions.push({
        [Op.or]: [
          { normalizedAddress: { [Op.like]: `%quan ${num}%` } },
          { normalizedAddress: { [Op.like]: `%quan 0${num}%` } },
          { [Op.and]: [{ normalizedAddress: null }, { address: { [Op.like]: `%Quận ${num}%` } }] },
          { [Op.and]: [{ normalizedAddress: null }, { address: { [Op.like]: `%Q.${num}%` } }] },
        ]
      });
    } else {
      // Tìm chính trong normalizedAddress + fallback address gốc khi NULL
      const searchOr = [
        { normalizedAddress: { [Op.like]: `%${normSearch}%` } },
        {
          [Op.and]: [
            { normalizedAddress: null },
            { address: { [Op.like]: `%${rawSearch}%` } }
          ]
        }
      ];

      // Staff/admin: tìm thêm trong normalizedExactAddress
      if (isStaff) {
        searchOr.push({ normalizedExactAddress: { [Op.like]: `%${normSearch}%` } });
      }

      andConditions.push({ [Op.or]: searchOr });
    }
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
      isPublished, search, province, district, page, limit,
      agentId
    } = req.query;

    const userRole = (req.user?.role || '').toLowerCase();
    const isAdminOrManager = userRole === 'admin' || userRole === 'manager';
    const isStaff = req.user && ['Admin', 'Manager', 'Agent'].includes(req.user.role);

    // Mặc định phân trang: 12 BDS / trang cho public, 20 cho staff
    const pageNum  = Math.max(1, parseInt(page, 10)  || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || (isStaff ? 20 : 12)));
    const offset   = (pageNum - 1) * limitNum;

    // --- Cache key ---
    // Dùng chuỗi ngắn gọn thay vì JSON.stringify toàn bộ object (tránh key dài)
    const cacheKey = !isStaff
      ? `props|${[status||'',type||'',minPrice||'',maxPrice||'',featured||'',search||'',province||'',district||'',agentId||'',pageNum,limitNum].join('|')}`
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

    // Phân quyền theo role: Role Manager trong trang quản lý (Admin context) chỉ được xem BĐS do chính mình thêm vào
    const isAdminContext = req.path === '/admin' || req.query.admin === 'true';
    if (isAdminContext && userRole === 'manager') {
      where.agentId = req.user.id;
    } else if (agentId && agentId !== 'All' && agentId !== '') {
      where.agentId = agentId;
    }

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

    // Áp dụng bộ lọc địa chỉ (tối ưu: tìm chủ yếu trong normalizedAddress)
    const addressConditions = buildAddressConditions({ search, province, district, isStaff });
    if (addressConditions.length === 1) {
      Object.assign(where, addressConditions[0]);
    } else if (addressConditions.length > 1) {
      where[Op.and] = addressConditions;
    }

    // Tách COUNT và SELECT để tối ưu:
    // - COUNT dùng query nhẹ (không JOIN, không load columns lớn)
    // - SELECT mới JOIN User, chỉ lấy đúng trang hiện tại
    const [count, rows] = await Promise.all([
      Property.count({ where }),
      Property.findAll({
        where,
        attributes: {
          exclude: isAdminOrManager
            ? ['normalizedAddress', 'normalizedExactAddress']       // staff: ẩn internal columns
            : ['exactAddress', 'zaloGroupUrl', 'commission', 'normalizedAddress', 'normalizedExactAddress']
        },
        include: [
          { model: User, as: 'agent', attributes: ['id', 'name', 'email', 'phone'] }
        ],
        order: [['isFeatured', 'DESC'], ['createdAt', 'DESC']],
        limit:  limitNum,
        offset,
      }),
    ]);

    const safeProperties = rows.map(p => filterSensitivePropertyFields(p.toJSON(), req.user));

    const result = {
      total:       count,
      totalPages:  Math.ceil(count / limitNum),
      currentPage: pageNum,
      pageSize:    limitNum,
      data:        safeProperties,
    };

    if (cacheKey) {
      // Cache ngắn hơn (2 phút) để dữ liệu fresh hơn, tránh stale khi có thêm BĐS mới
      cache.set(cacheKey, result, 2 * 60 * 1000);
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
      // Manager tạo BĐS luôn gán agentId là chính mình, Admin có thể gán cho người khác
      agentId: isAdmin ? (cleanData.agentId || (req.user ? req.user.id : null)) : (req.user ? req.user.id : null),
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

      // Manager chỉ có thể cập nhật BĐS do chính mình thêm vào
      if (userRole === 'manager' && property.agentId !== req.user.id) {
        return res.status(403).json({ message: 'Bạn chỉ có quyền chỉnh sửa bất động sản do chính mình thêm vào.' });
      }

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

    const userRole = (req.user?.role || '').toLowerCase();
    if (userRole === 'manager' && property.agentId !== req.user.id) {
      return res.status(403).json({ message: 'Bạn chỉ có quyền thay đổi trạng thái đăng tin bất động sản do chính mình thêm vào.' });
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
      const userRole = (req.user?.role || '').toLowerCase();
      if (userRole === 'manager' && property.agentId !== req.user.id) {
        return res.status(403).json({ message: 'Bạn chỉ có quyền xóa bất động sản do chính mình thêm vào.' });
      }

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
