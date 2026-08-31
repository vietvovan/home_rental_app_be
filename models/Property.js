const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const normalizeText = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .trim();
};

const Property = sequelize.define('Property', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  normalizedAddress: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  exactAddress: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  normalizedExactAddress: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  deposit: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  commission: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: 0,
  },
  beds: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  baths: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  area: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Phòng trọ',
  },
  status: {
    type: DataTypes.STRING(100),
    defaultValue: 'Đang trống',
  },
  statusDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  elevatorType: {
    type: DataTypes.STRING,
    defaultValue: 'Thang máy',
  },
  availableFloors: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  alleyType: {
    type: DataTypes.STRING,
    defaultValue: 'Xe máy',
  },
  hasWashingMachine: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  hasDryer: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  hasEvCharging: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  allowPets: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  maxOccupants: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 2,
  },
  maxVehicles: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 2,
  },
  allowForeigners: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  allowCooking: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  curfew: {
    type: DataTypes.STRING,
    defaultValue: 'Tự do',
  },
  liveWithHost: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  frontage: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  length: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  width: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  allowStay: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  floors: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  businessTypes: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  image: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  videoUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  zaloGroupUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  amenities: {
    type: DataTypes.JSON,
  },
  serviceFees: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  availability: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  leaseTerm: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  furnishing: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  agentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  listedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isPublished: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  }
}, {
  tableName: 'Properties',
  timestamps: true,
  indexes: [
    // Index cơ bản
    { fields: ['status'] },
    { fields: ['isFeatured'] },
    { fields: ['isPublished'] },
    { fields: ['type'] },
    { fields: ['price'] },
    { fields: ['agentId'] },
    { fields: ['createdAt'] },
    // Composite index chính cho query public (isPublished là filter đầu tiên luôn)
    { fields: ['isPublished', 'isFeatured', 'createdAt'] },
    { fields: ['isPublished', 'status', 'createdAt'] },
    { fields: ['isPublished', 'type', 'price'] },
    // Index cho tìm kiếm địa chỉ (LIKE search prefix - partial index)
    { fields: ['normalizedAddress'] },
    // Index bổ sung cho các trường filter phổ biến
    { fields: ['beds'] },
    { fields: ['availability'] },
  ],
  hooks: {
    beforeValidate: (property) => {
      if (property.address) {
        property.normalizedAddress = normalizeText(property.address);
      }
      if (property.exactAddress) {
        property.normalizedExactAddress = normalizeText(property.exactAddress);
      }
    },
    beforeSave: (property) => {
      if (property.address) {
        property.normalizedAddress = normalizeText(property.address);
      }
      if (property.exactAddress) {
        property.normalizedExactAddress = normalizeText(property.exactAddress);
      }
    },
  },
});

module.exports = Property;
