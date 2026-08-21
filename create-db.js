const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${env}` });
dotenv.config();

async function createDb() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT, 10) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASS || '';
  const dbName = process.env.DB_NAME || 'next_home_db';

  try {
    console.log(`⏳ Đang kết nối tới MySQL server tại ${host}:${port} với user '${user}'...`);
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`✅ Cơ sở dữ liệu '${dbName}' đã sẵn sàng (đã tạo mới hoặc đã tồn tại).`);
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khởi tạo database:', error.message);
    process.exit(1);
  }
}
createDb();
