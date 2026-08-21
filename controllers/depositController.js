const { Deposit, Property } = require('../models');

// @desc    Get all deposits
// @route   GET /api/admin/deposits
// @access  Private/Admin
const getDeposits = async (req, res) => {
  try {
    const deposits = await Deposit.findAll({
      include: [
        { model: Property, as: 'property', attributes: ['id', 'title', 'price'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(deposits);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new deposit
// @route   POST /api/admin/deposits
// @access  Private/Admin
const createDeposit = async (req, res) => {
  try {
    const deposit = await Deposit.create(req.body);
    res.status(201).json(deposit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update deposit status
// @route   PUT /api/admin/deposits/:id/status
// @access  Private/Admin
const updateDepositStatus = async (req, res) => {
  try {
    const deposit = await Deposit.findByPk(req.params.id);

    if (deposit) {
      deposit.status = req.body.status;
      const updatedDeposit = await deposit.save();
      res.json(updatedDeposit);
    } else {
      res.status(404).json({ message: 'Deposit not found' });
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
