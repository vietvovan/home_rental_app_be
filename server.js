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

// Hỗ trợ nhiều domain: FRONTEND_URLS="https://a.com,https://b.com" hoặc FRONTEND_URL="https://a.com"
const extraOrigins = process.env.FRONTEND_URLS
  ? process.env.FRONTEND_URLS.split(',').map(s => s.trim()).filter(Boolean)
  : [];

const allowedOrigins = [
  'http://localhost:5173',    // Vite dev
  'http://localhost:4173',    // Vite preview
  'http://localhost:3000',    // CRA fallback
  process.env.FRONTEND_URL,  // Domain chính (Vercel hoặc custom domain)
  ...extraOrigins,            // Các domain bổ sung (ví dụ: cả Vercel lẫn domain Mắt Bão)
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
app.disable('x-powered-by');

// Standard HTTP Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json({ limit: '10mb' }));

// Global Security & Anti-Malware Sanitizer Middleware
const securitySanitizer = require('./middlewares/securitySanitizer');
app.use(securitySanitizer);

// Rate Limiting & Anti-Spam Middlewares
const { globalLimiter, authLimiter } = require('./middlewares/rateLimiter');
app.use('/api', globalLimiter);

// Routes
const authRoutes = require('./routes/authRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const leadRoutes = require('./routes/leadRoutes');
const userRoutes = require('./routes/userRoutes');
const depositRoutes = require('./routes/depositRoutes');
const blogRoutes = require('./routes/blogRoutes');
const statsRoutes = require('./routes/statsRoutes');
const contactRoutes = require('./routes/contactRoutes');

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/deposits', depositRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/contact', contactRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'NextHome API is running...',
    status: 'online',
    env: process.env.NODE_ENV || 'development',
    time: new Date().toISOString()
  });
});

// 404 Not Found Handler
app.use((req, res) => {
  res.status(404).json({ message: `API Endpoint ${req.originalUrl} không tồn tại` });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('❌ [Unhandled Error]', err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || 'Lỗi máy chủ nội bộ',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
});

// Chống sập server khi gặp lỗi không đồng bộ chưa bắt (Uncaught Exception & Unhandled Rejection)
process.on('uncaughtException', (err) => {
  console.error('💥 [Uncaught Exception Crash Prevented]:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ [Unhandled Promise Rejection Prevented]:', reason);
});

const PORT = parseInt(process.env.PORT, 10) || 5000;

// Lắng nghe port NGAY LẬP TỨC để Render / Railway / hosting detect được port
// DB sẽ được khởi tạo bất đồng bộ sau khi server đã bind
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 [Backend] Server đang chạy ở chế độ "${process.env.NODE_ENV || 'development'}" tại: http://0.0.0.0:${PORT}`);
  console.log(`📡 [API Endpoint] http://0.0.0.0:${PORT}/api`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ [Port Error] Cổng ${PORT} đã bị sử dụng bởi tiến trình khác.`);
    console.error(`👉 Hãy chạy lệnh sau để giải phóng cổng: npx kill-port ${PORT}`);
  } else {
    console.error('❌ [Server Error]', err.message);
  }
  process.exit(1);
});

// Khởi tạo DB và migrate NGAY SAU KHI port đã được bind
const initDatabase = async () => {
  try {
    // 1. Kiểm tra kết nối đến MySQL
    await sequelize.authenticate();
    console.log('✅ [MySQL] Kết nối cơ sở dữ liệu MySQL thành công!');

    // 2. Tự động kiểm tra, thêm cột mới và đổi ENUM sang VARCHAR
    const autoMigrate = require('./config/migrate');
    await autoMigrate();

    // 3. Tự động đồng bộ các bảng và index (tạo bảng/index nếu chưa tồn tại)
    await sequelize.sync();
    console.log('✅ [Sequelize] Đồng bộ cấu trúc bảng thành công.');

    // 4. Khởi động bộ nhắc nhở lịch hẹn (reminder scheduler)
    const { startReminderScheduler } = require('./utils/reminderScheduler');
    startReminderScheduler();

    console.log('✅ [Backend] Khởi tạo hoàn tất, sẵn sàng phục vụ requests.');
  } catch (err) {
    console.error('❌ [MySQL Error] Không thể kết nối đến cơ sở dữ liệu MySQL:', err.message);
    console.error('👉 Vui lòng kiểm tra lại thông tin cấu hình trong file .env (Host, Port, User, Password, DB Name)');
    // Không process.exit() để server vẫn còn chạy (healthcheck endpoint vẫn respond)
  }
};

// Xử lý đóng kết nối an toàn khi server nhận tín hiệu dừng (Graceful Shutdown)
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 [Server] Nhận tín hiệu ${signal}. Đang đóng kết nối an toàn...`);
  server.close(async () => {
    try {
      await sequelize.close();
      console.log('🔒 [MySQL] Đã đóng toàn bộ kết nối cơ sở dữ liệu.');
    } catch (dbErr) {
      console.error('⚠️ [MySQL] Lỗi khi đóng DB:', dbErr.message);
    }
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

initDatabase();