const { Sequelize } = require('sequelize');

const isProduction = process.env.NODE_ENV === 'production';
const useSSL = process.env.DB_SSL === 'true' || isProduction;

const sequelize = new Sequelize(
  process.env.DB_NAME || 'test',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 4000,
    dialect: 'mysql',
    logging: false,
    dialectOptions: {
      connectTimeout: 60000,
      ...(useSSL
        ? {
            ssl: {
              minVersion: 'TLSv1.2',
              rejectUnauthorized: false, // TiDB Cloud SSL
            },
          }
        : {}),
      // Giữ kết nối socket không bị treo và phát hiện kết nối đứt sớm
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    },
    // Cấu hình Connection Pool tối ưu cho Serverless (TiDB Cloud tự ngắt idle connection)
    pool: {
      max: 10,           // Số connection tối đa
      min: 0,            // Không giữ connection rảnh rỗi khi không có request
      acquire: 30000,    // Thời gian tối đa (ms) chờ lấy connection trước khi ném lỗi timeout
      idle: 10000,       // Connection rảnh rỗi quá 10s sẽ bị giải phóng
      evict: 10000,      // Chu kỳ dọn dẹp connection rảnh rỗi (mỗi 10s)
    },
    // Tự động kết nối lại (Auto-reconnect) khi gặp lỗi đứt kết nối mạng / serverless idle drop
    retry: {
      match: [
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
        /TimeoutError/,
        /PROTOCOL_CONNECTION_LOST/,
        /ECONNRESET/,
        /ETIMEDOUT/,
        /EPIPE/,
      ],
      max: 5, // Thử lại tối đa 5 lần trước khi báo lỗi
      backoffBase: 500, // Đợi 500ms trước lần thử đầu
      backoffExponent: 1.5,
    },
  }
);

module.exports = sequelize;

