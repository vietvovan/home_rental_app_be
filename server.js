const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Nạp biến môi trường theo thứ tự ưu tiên
const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${env}` });
dotenv.config();

const { sequelize } = require('./models');

const app = express();

// Cấu hình CORS
const isDev = (process.env.NODE_ENV || 'development') === 'development';

const allowedOrigins = [
  'http://localhost:5173',   // Vite dev
  'http://localhost:4173',   // Vite preview
  'http://localhost:3000',   // CRA fallback
  'http://localhost:8443',   // Vite custom port
  process.env.FRONTEND_URL, // Production URL từ .env
].filter(Boolean);

app.use(cors({
  origin: isDev
    ? true  // Dev: cho phép mọi origin (tránh mọi CORS error khi dev)
    : (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS blocked: Origin '${origin}' not allowed`));
        }
      },
  credentials: true,
}));

const compression = require('compression');
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Global Security & Anti-Malware Sanitizer Middleware
const securitySanitizer = require('./middlewares/securitySanitizer');
app.use(securitySanitizer);

// Rate Limiting & Anti-Spam Middlewares
const { globalLimiter, authLimiter, writeActionLimiter } = require('./middlewares/rateLimiter');
app.use('/api', globalLimiter);

// Routes
const authRoutes = require('./routes/authRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const leadRoutes = require('./routes/leadRoutes');
const userRoutes = require('./routes/userRoutes');
const depositRoutes = require('./routes/depositRoutes');
const blogRoutes = require('./routes/blogRoutes');
const statsRoutes = require('./routes/statsRoutes');

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/properties', writeActionLimiter, propertyRoutes);
app.use('/api/leads', writeActionLimiter, leadRoutes);
app.use('/api/users', writeActionLimiter, userRoutes);
app.use('/api/deposits', writeActionLimiter, depositRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/stats', statsRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'NextHome API is running...',
    status: 'online',
    env: process.env.NODE_ENV || 'development',
    time: new Date().toISOString()
  });
});

const PORT = parseInt(process.env.PORT, 10) || 5000;

// Khởi động server sau khi xác thực và đồng bộ cơ sở dữ liệu MySQL
const startServer = async () => {
  try {
    // 1. Kiểm tra kết nối đến MySQL
    await sequelize.authenticate();
    console.log('✅ [MySQL] Kết nối cơ sở dữ liệu MySQL thành công!');

    // 2. Tự động đồng bộ các bảng (alter: true giúp cập nhật bảng mà không làm mất dữ liệu)
    await sequelize.sync({ alter: true });
    console.log('✅ [Sequelize] Đồng bộ cấu trúc bảng thành công.');

    // 3. Lắng nghe yêu cầu trên cổng PORT
    const server = app.listen(PORT, () => {
      console.log(`🚀 [Backend] Server đang chạy ở chế độ "${process.env.NODE_ENV || 'development'}" tại: http://localhost:${PORT}`);
      console.log(`📡 [API Endpoint] http://localhost:${PORT}/api`);
    });

    // Xử lý lỗi cổng đã bị chiếm (EADDRINUSE)
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ [Port Error] Cổng ${PORT} đã bị sử dụng bởi tiến trình khác.`);
        console.error(`👉 Hãy chạy lệnh sau để giải phóng cổng: npx kill-port ${PORT}`);
        console.error(`👉 Hoặc đổi PORT trong file .env sang cổng khác (ví dụ PORT=5001)`);
      } else {
        console.error('❌ [Server Error]', err.message);
      }
      process.exit(1);
    });

  } catch (err) {
    console.error('❌ [MySQL Error] Không thể kết nối đến cơ sở dữ liệu MySQL:', err.message);
    console.error('👉 Vui lòng kiểm tra lại thông tin cấu hình trong file .env (Host, Port, User, Password, DB Name)');
    process.exit(1);
  }
};

startServer();