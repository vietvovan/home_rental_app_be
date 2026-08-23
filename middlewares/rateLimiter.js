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
 * @param {number} options.minIntervalMs - Khoảng cách tối thiểu giữa 2 request POST liên tiếp (Anti Rapid Click)
 */
function createRateLimiter({
  windowMs = 60 * 1000,
  max = 120,
  message = 'Bạn đang thực hiện thao tác quá nhanh. Vui lòng đợi trong giây lát!',
  minIntervalMs = 300, // 300ms giữa các lần click
}) {
  return (req, res, next) => {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown-ip';
    const key = `${clientIp}:${req.baseUrl || req.path}`;
    const now = Date.now();

    const timestamps = ipRequestStore.get(key) || [];
    
    // Lọc các request còn nằm trong windowMs
    const recent = timestamps.filter(t => now - t < windowMs);

    // 1. Kiểm tra spam click liên tiếp (Rapid Click Spamming) với các method ghi dữ liệu
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
      const lastRequestTime = timestamps[timestamps.length - 1];
      if (lastRequestTime && (now - lastRequestTime < minIntervalMs)) {
        return res.status(429).json({
          success: false,
          error: 'TOO_MANY_REQUESTS',
          message: 'Vui lòng không nhấn nút liên tục! Hệ thống đang xử lý yêu cầu trước đó.',
        });
      }
    }

    // 2. Kiểm tra vượt hạn mức tổng trong windowMs
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

// 1. Global Limiter cho toàn bộ API (150 req/phút)
const globalLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 150,
  message: 'Bạn đã gửi quá nhiều yêu cầu đến máy chủ. Vui lòng thử lại sau 1 phút.',
  minIntervalMs: 200,
});

// 2. Strict Auth Limiter cho Đăng nhập / Đăng ký (15 lần / 5 phút)
const authLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 15,
  message: 'Quá nhiều lần thử đăng nhập/đăng ký sai. Để bảo vệ tài khoản, vui lòng thử lại sau 5 phút.',
  minIntervalMs: 800,
});

// 3. Write Action Limiter cho Thêm khách hàng, BĐS, Hợp đồng (30 lần / 5 phút)
const writeActionLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: 'Bạn đang tạo dữ liệu quá nhanh. Vui lòng kiểm tra lại thông tin và thử lại sau ít phút.',
  minIntervalMs: 500,
});

module.exports = {
  globalLimiter,
  authLimiter,
  writeActionLimiter,
  createRateLimiter,
};
