const { Deposit, Property } = require('../models');

// @desc    Get all deposits (with pagination)
// @route   GET /api/deposits/admin
// @access  Private (any authenticated user)
const getDeposits = async (req, res) => {
  try {
    const pageNum  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset   = (pageNum - 1) * limitNum;

    const { count, rows } = await Deposit.findAndCountAll({
      include: [
        { model: Property, as: 'property', attributes: ['id', 'title', 'price'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset,
      distinct: true,
    });

    res.json({
      total: count,
      totalPages: Math.ceil(count / limitNum),
      currentPage: pageNum,
      pageSize: limitNum,
      data: rows,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new deposit
// @route   POST /api/deposits/admin
// @access  Private/Admin or Manager
const createDeposit = async (req, res) => {
  try {
    const { propertyId, tenantName, tenantPhone, amount, status } = req.body;

    if (!propertyId) {
      return res.status(400).json({ message: 'Vui lòng chọn bất động sản cho hợp đồng cọc.' });
    }
    if (!tenantName || !String(tenantName).trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập tên khách hàng.' });
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Số tiền cọc không hợp lệ.' });
    }

    const deposit = await Deposit.create({
      ...req.body,
      amount: Number(amount),
      status: status || 'Chờ xác nhận',
    });
    res.status(201).json(deposit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update deposit status
// @route   PUT /api/deposits/admin/:id/status
// @access  Private/Admin or Manager
const updateDepositStatus = async (req, res) => {
  try {
    const deposit = await Deposit.findByPk(req.params.id);

    if (deposit) {
      deposit.status = req.body.status;
      const updatedDeposit = await deposit.save();
      res.json(updatedDeposit);
    } else {
      res.status(404).json({ message: 'Không tìm thấy hợp đồng cọc' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDeposits,
  createDeposit,
  updateDepositStatus,
};
