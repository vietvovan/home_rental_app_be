const { Lead, User } = require('../models');

// @desc    Create a new lead (Public form submission)
// @route   POST /api/leads
// @access  Public
const createLead = async (req, res) => {
  try {
    const lead = await Lead.create(req.body);
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

module.exports = {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
};
