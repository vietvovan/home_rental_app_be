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
    type: DataTypes.STRING(100),
    defaultValue: 'Đã nhận',
  },
  depositDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  }
}, {
  tableName: 'Deposits',
  timestamps: true,
  indexes: [
    { fields: ['contractNumber'], unique: true },
    { fields: ['status'] },
    { fields: ['propertyId'] },
    { fields: ['depositDate'] },
  ],
});

module.exports = Deposit;
