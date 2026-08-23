/**
 * In-Memory Sliding Window Rate Limiter & Anti-Spam Middleware
 * Ngăn chặn DDoS, Brute-force, và Spam bấm nút liên tục (Rapid Click Spam)
 */

// Bảng lưu trữ request lịch sử theo IP
const ipRequestStore = new Map();

// Tự động dọn dẹp bộ nhớ mỗi 5 phút
setInterval(() => {
  const now = Date.now();
  for (const [key, records] of ipRequestStore.entries()) {
    const valid = records.filter(timestamp => now - timestamp < 15 * 60 * 1000);
    if (valid.length === 0) {
      ipRequestStore.delete(key);
    } else {
      ipRequestStore.set(key, valid);
    }
  }
}, 5 * 60 * 1000);

/**
 * Factory tạo middleware giới hạn tần suất
 * @param {Object} options
 * @param {number} options.windowMs - Khung thời gian (miligiây)
 * @param {number} options.max - Số lượng request tối đa trong khung thời gian
 * @param {string} options.message - Thông báo khi vượt ngưỡng
 * @param {number} options.minIntervalMs - Khoảng cách tối thiểu giữa 2 request ghi dữ liệu liên tiếp (Anti Rapid Click)
 * @param {Array<string>} options.methodsOnly - Chỉ áp dụng cho các HTTP methods này (e.g. ['POST', 'PUT', 'DELETE'])
 */
function createRateLimiter({
  windowMs = 60 * 1000,
  max = 500,
  message = 'Bạn đang thực hiện thao tác quá nhanh. Vui lòng đợi trong giây lát!',
  minIntervalMs = 100,
  methodsOnly = null,
}) {
  return (req, res, next) => {
    // 1. Tự động bỏ qua rate limiter khi đang chạy môi trường phát triển cục bộ (Localhost / Development)
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '';
    const isLocal = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1' || req.hostname === 'localhost';
    if (isLocal || process.env.NODE_ENV === 'development') {
      return next();
    }

    // 2. Bỏ qua nếu chỉ áp dụng cho một số HTTP method cụ thể và method hiện tại không khớp (ví dụ: GET)
    if (methodsOnly && !methodsOnly.includes(req.method)) {
      return next();
    }

    const key = `${clientIp}:${req.baseUrl || req.path}:${methodsOnly ? 'write' : 'all'}`;
    const now = Date.now();

    const timestamps = ipRequestStore.get(key) || [];
    
    // Lọc các request còn nằm trong windowMs
    const recent = timestamps.filter(t => now - t < windowMs);

    // 3. Kiểm tra spam click liên tiếp (Rapid Click Spamming) với các method ghi dữ liệu (POST, PUT, DELETE)
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
      const lastRequestTime = recent[recent.length - 1];
      if (lastRequestTime && (now - lastRequestTime < minIntervalMs)) {
        return res.status(429).json({
          success: false,
          error: 'TOO_MANY_REQUESTS',
          message: 'Vui lòng không nhấn nút liên tục! Hệ thống đang xử lý yêu cầu trước đó.',
        });
      }
    }

    // 4. Kiểm tra vượt hạn mức tổng trong windowMs
    if (recent.length >= max) {
      const retryAfter = Math.ceil((windowMs - (now - recent[0])) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message,
        retryAfter: `${retryAfter}s`,
      });
    }

    // Lưu timestamp mới
    recent.push(now);
    ipRequestStore.set(key, recent);

    next();
  };
}

// 1. Global Limiter cho toàn bộ API (500 req/phút)
const globalLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 500,
  message: 'Bạn đã gửi quá nhiều yêu cầu đến máy chủ. Vui lòng thử lại sau 1 phút.',
  minIntervalMs: 50,
});

// 2. Strict Auth Limiter cho Đăng nhập / Đăng ký (50 lần / 5 phút trên production)
const authLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 50,
  message: 'Quá nhiều lần thử đăng nhập/đăng ký sai. Để bảo vệ tài khoản, vui lòng thử lại sau 5 phút.',
  minIntervalMs: 300,
  methodsOnly: ['POST'],
});

// 3. Write Action Limiter - CHỈ áp dụng cho thao tác ghi dữ liệu POST / PUT / DELETE (150 lần / 1 phút)
const writeActionLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 150,
  message: 'Bạn đang thao tác dữ liệu quá nhanh. Vui lòng thử lại sau ít phút.',
  minIntervalMs: 150,
  methodsOnly: ['POST', 'PUT', 'DELETE', 'PATCH'],
});

module.exports = {
  globalLimiter,
  authLimiter,
  writeActionLimiter,
  createRateLimiter,
};
