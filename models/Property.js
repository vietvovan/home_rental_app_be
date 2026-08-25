const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

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
    type: DataTypes.ENUM('Chung cư mini', 'MBKD', 'Sàn VP', 'Nhà nguyên căn', 'Homestay', 'Phòng trọ'),
    allowNull: false,
    defaultValue: 'Phòng trọ',
  },
  status: {
    type: DataTypes.ENUM('Đang trống', 'Sắp trống', 'Đang hoàn thiện', 'Đã cho thuê', 'Đang thương lượng', 'Còn trống'),
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
    defaultValue: 'Ô tô',
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
  image: {
    type: DataTypes.STRING(500),
  },
  videoUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  amenities: {
    type: DataTypes.JSON,
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
  }
}, {
  tableName: 'Properties',
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['isFeatured'] },
    { fields: ['isPublished'] },
    { fields: ['type'] },
    { fields: ['price'] },
    { fields: ['agentId'] },
    { fields: ['createdAt'] },
  ],
});

module.exports = Property;
