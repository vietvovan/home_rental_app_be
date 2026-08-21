const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Deposit = sequelize.define('Deposit', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  contractNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  tenantName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('Đã nhận', 'Đã hoàn trả', 'Bị giữ cọc'),
    defaultValue: 'Đã nhận',
  },
  depositDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  }
}, {
  tableName: 'Deposits',
  timestamps: true,
});

module.exports = Deposit;
