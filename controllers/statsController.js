const { Property, Lead, Deposit } = require('../models');
const { Op } = require('sequelize');

// @desc    Get overview stats
// @route   GET /api/admin/stats/overview
// @access  Private/Admin
const getOverviewStats = async (req, res) => {
  try {
    const totalProperties = await Property.count();
    const newLeads = await Lead.count({
      where: { status: 'Mới' }
    });
    
    // Total revenue from deposits (Status: Đã nhận)
    const totalRevenueResult = await Deposit.sum('amount', {
      where: { status: 'Đã nhận' }
    });

    res.json({
      totalProperties,
      newLeads,
      totalRevenue: totalRevenueResult || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get rental trends
// @route   GET /api/admin/stats/rental-trends
// @access  Private/Admin
const getRentalTrends = async (req, res) => {
  try {
    // Trả về mock data để xử lý biểu đồ trên frontend (cho demo)
    const mockTrends = [
      { month: 'Tháng 1', revenue: 15000000, inquiries: 40 },
      { month: 'Tháng 2', revenue: 18000000, inquiries: 45 },
      { month: 'Tháng 3', revenue: 20000000, inquiries: 55 },
      { month: 'Tháng 4', revenue: 12000000, inquiries: 30 },
      { month: 'Tháng 5', revenue: 25000000, inquiries: 70 },
      { month: 'Tháng 6', revenue: 22000000, inquiries: 60 },
    ];

    res.json(mockTrends);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getOverviewStats,
  getRentalTrends,
};
