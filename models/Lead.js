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
    type: DataTypes.ENUM('Đã hẹn xem', 'Đã đóng', 'Thất bại', 'Viewing Scheduled', 'Closed', 'Lost', 'Mới', 'Đã liên hệ'),
    defaultValue: 'Đã hẹn xem',
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
  indexes: [
    { fields: ['status'] },
    { fields: ['assigneeId'] },
    { fields: ['email'] },
    { fields: ['createdAt'] },
  ],
});

module.exports = Lead;
