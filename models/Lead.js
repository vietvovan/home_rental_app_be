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
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING,
  },
  nationality: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  occupation: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  leaseTerm: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '12',
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
  scheduledViewings: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(100),
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
