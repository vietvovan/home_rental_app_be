const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const BlogPost = sequelize.define('BlogPost', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  excerpt: {
    type: DataTypes.TEXT,
  },
  content: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING,
  },
  image: {
    type: DataTypes.STRING(500),
  },
  authorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  publishedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  readTime: {
    type: DataTypes.STRING,
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  }
}, {
  tableName: 'BlogPosts',
  timestamps: true,
  indexes: [
    { fields: ['isFeatured'] },
    { fields: ['category'] },
    { fields: ['authorId'] },
    { fields: ['publishedAt'] },
  ],
});

module.exports = BlogPost;
