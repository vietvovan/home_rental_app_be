const { Lead, User } = require('../models');

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
    const { status, assigneeId } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (assigneeId) where.assigneeId = assigneeId;

    // Agents can only see their assigned leads unless they are Admin/Manager
    if (req.user.role === 'Agent') {
      where.assigneeId = req.user.id;
    }

    if (req.query.page && req.query.limit) {
      const pageNum = parseInt(req.query.page, 10) || 1;
      const limitNum = parseInt(req.query.limit, 10) || 10;
      const offset = (pageNum - 1) * limitNum;

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

      return res.json({
        total: count,
        totalPages: Math.ceil(count / limitNum),
        currentPage: pageNum,
        data: rows
      });
    }

    const leads = await Lead.findAll({
      where,
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(leads);
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
