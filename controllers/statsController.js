const { Property, Lead, Deposit, sequelize } = require('../models');
const { Op } = require('sequelize');

// @desc    Get overview stats
// @route   GET /api/stats/overview
// @access  Private/Admin or Manager
const getOverviewStats = async (req, res) => {
  try {
    const totalProperties = await Property.count();
    const publishedProperties = await Property.count({ where: { isPublished: true } });
    const newLeads = await Lead.count({ where: { status: 'Mới' } });

    // Total revenue from deposits (Status: Đã nhận)
    const totalRevenueResult = await Deposit.sum('amount', {
      where: { status: 'Đã nhận' }
    });

    res.json({
      totalProperties,
      publishedProperties,
      newLeads,
      totalRevenue: totalRevenueResult || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get rental trends (6 months) - real data from DB
// @route   GET /api/stats/rental-trends
// @access  Private/Admin or Manager
const getRentalTrends = async (req, res) => {
  try {
    // Lấy 6 tháng gần nhất
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`,
        start: new Date(d.getFullYear(), d.getMonth(), 1),
        end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
      });
    }

    const trends = await Promise.all(months.map(async (m) => {
      const [revenue, inquiries] = await Promise.all([
        // Doanh thu: tổng tiền cọc đã nhận trong tháng
        Deposit.sum('amount', {
          where: {
            status: 'Đã nhận',
            createdAt: { [Op.between]: [m.start, m.end] }
          }
        }),
        // Lượt khách mới trong tháng (leads tạo mới)
        Lead.count({
          where: {
            createdAt: { [Op.between]: [m.start, m.end] }
          }
        }),
      ]);

      return {
        month: m.label,
        revenue: revenue || 0,
        inquiries: inquiries || 0,
      };
    }));

    res.json(trends);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getOverviewStats,
  getRentalTrends,
};
