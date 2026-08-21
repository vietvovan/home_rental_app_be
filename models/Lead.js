const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Lead = sequelize.define('Lead', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
  },
  budget: {
    type: DataTypes.DECIMAL(15, 2),
  },
  area: {
    type: DataTypes.STRING,
  },
  moveInDate: {
    type: DataTypes.DATEONLY,
  },
  status: {
    type: DataTypes.ENUM('Mới', 'Đã liên hệ', 'Đã hẹn xem', 'Đã đóng', 'Thất bại'),
    defaultValue: 'Mới',
  },
  assigneeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
  }
}, {
  tableName: 'Leads',
  timestamps: true,
});

module.exports = Lead;
