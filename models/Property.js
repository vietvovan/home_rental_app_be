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
    type: DataTypes.ENUM('Penthouse', 'Loft', 'Biệt thự', 'Studio', 'Chung cư', 'Nhà phố'),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('Còn trống', 'Đã cho thuê', 'Đang thương lượng'),
    defaultValue: 'Còn trống',
  },
  image: {
    type: DataTypes.STRING(500),
  },
  amenities: {
    type: DataTypes.JSON,
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
  }
}, {
  tableName: 'Properties',
  timestamps: true,
});

module.exports = Property;
