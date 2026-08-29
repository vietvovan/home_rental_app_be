const { Lead, User } = require('../models');
const cache = require('../utils/memCache');

// @desc    Create a new lead (Public form submission)
// @route   POST /api/leads
// @access  Public
const createLead = async (req, res) => {
  try {
    const { name, email, phone, budget, area, moveInDate, notes, nationality, occupation, leaseTerm, scheduledViewings, status, assigneeId } = req.body;

    if (!name || (!email && !phone)) {
      return res.status(400).json({ message: 'Vui lòng cung cấp họ tên và số điện thoại hoặc email liên hệ.' });
    }

    const lead = await Lead.create({
      name: name ? String(name).trim() : '',
      email: email ? String(email).trim().toLowerCase() : '',
      phone: phone ? String(phone).trim() : '',
      nationality: nationality ? String(nationality).trim() : null,
      occupation: occupation ? String(occupation).trim() : null,
      leaseTerm: leaseTerm ? String(leaseTerm).trim() : '12',
      budget: Number(budget) || null,
      area: area ? String(area).trim() : null,
      moveInDate: moveInDate || null,
      scheduledViewings: typeof scheduledViewings === 'string' ? scheduledViewings : JSON.stringify(scheduledViewings || []),
      notes: typeof notes === 'string' ? notes : JSON.stringify(notes || []),
      status: status || 'Đã hẹn xem',
      assigneeId: assigneeId || null,
    });

    // Xóa cache leads khi có lead mới
    cache.delByPrefix('leads:');
    res.status(201).json(lead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all leads
// @route   GET /api/admin/leads
// @access  Private/Admin or Manager or Agent
const getLeads = async (req, res) => {
  try {
    const { status, assigneeId, search } = req.query;

    const where = {};
    if (status) where.status = status;
    if (assigneeId) where.assigneeId = assigneeId;

    // Agents chỉ xem lead của mình
    if (req.user.role === 'Agent') {
      where.assigneeId = req.user.id;
    }

    // Phân trang mặc định — bắt buộc để tránh tải toàn bộ DB
    const pageNum  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset   = (pageNum - 1) * limitNum;

    // Cache key theo tất cả params filter
    const cacheKey = `leads:${req.user.id}:${JSON.stringify({ status, assigneeId, search, pageNum, limitNum })}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    const { count, rows } = await Lead.findAndCountAll({
      where,
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset,
      distinct: true
    });

    const result = {
      total:       count,
      totalPages:  Math.ceil(count / limitNum),
      currentPage: pageNum,
      pageSize:    limitNum,
      data:        rows
    };

    // Cache 2 phút cho lead (dữ liệu thay đổi thường xuyên hơn BDS)
    cache.set(cacheKey, result, 2 * 60 * 1000);
    res.set('X-Cache', 'MISS');
    return res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get public lead activity details (Read-only for shared link)
// @route   GET /api/leads/public/:id
// @access  Public
const getPublicLeadActivity = async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id, {
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'phone', 'email'] }
      ]
    });

    if (lead) {
      res.json(lead);
    } else {
      res.status(404).json({ message: 'Không tìm thấy thông tin hoạt động của khách hàng' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get lead by ID
// @route   GET /api/admin/leads/:id
// @access  Private/Admin
const getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id, {
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] }
      ]
    });

    if (lead) {
      // Check if user is allowed to view
      if (req.user.role === 'Agent' && lead.assigneeId !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to view this lead' });
      }
      res.json(lead);
    } else {
      res.status(404).json({ message: 'Lead not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update lead (status, assignee, etc)
// @route   PUT /api/admin/leads/:id
// @access  Private/Admin
const updateLead = async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);

    if (lead) {
      if (req.user.role === 'Agent' && lead.assigneeId !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to update this lead' });
      }

      const updatedLead = await lead.update(req.body);
      // Xóa cache leads khi cập nhật
      cache.delByPrefix('leads:');
      res.json(updatedLead);
    } else {
      res.status(404).json({ message: 'Lead not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete lead
// @route   DELETE /api/admin/leads/:id
// @access  Private/Admin or Manager (or Agent for their own lead)
const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Check if Agent is trying to delete someone else's lead
    if (req.user.role === 'Agent' && lead.assigneeId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this lead' });
    }

    await lead.destroy();
    // Xóa cache leads khi xóa
    cache.delByPrefix('leads:');
    res.json({ message: 'Lead removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createLead,
  getLeads,
  getPublicLeadActivity,
  getLeadById,
  updateLead,
  deleteLead,
};
