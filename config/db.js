const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

// Nạp file env phù hợp theo NODE_ENV, mặc định fallback về .env
const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${env}` });
dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'next_home_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? false : false, // Bật console.log nếu muốn debug câu lệnh SQL
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

module.exports = sequelize;
