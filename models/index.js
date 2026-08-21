const sequelize = require('../config/db');

const User = require('./User');
const Property = require('./Property');
const Lead = require('./Lead');
const Deposit = require('./Deposit');
const BlogPost = require('./BlogPost');

// Define Relationships

// User (Agent) -> Property (1:N)
User.hasMany(Property, { foreignKey: 'agentId', as: 'properties' });
Property.belongsTo(User, { foreignKey: 'agentId', as: 'agent' });

// User (Assignee) -> Lead (1:N)
User.hasMany(Lead, { foreignKey: 'assigneeId', as: 'assignedLeads' });
Lead.belongsTo(User, { foreignKey: 'assigneeId', as: 'assignee' });

// User (Author) -> BlogPost (1:N)
User.hasMany(BlogPost, { foreignKey: 'authorId', as: 'posts' });
BlogPost.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

// Property -> Deposit (1:N)
Property.hasMany(Deposit, { foreignKey: 'propertyId', as: 'deposits' });
Deposit.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

module.exports = {
  sequelize,
  User,
  Property,
  Lead,
  Deposit,
  BlogPost
};
