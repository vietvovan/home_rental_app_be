/**
 * memCache.js — In-Memory Cache với TTL
 * Không cần Redis, phù hợp cho scale vừa (hàng nghìn BDS).
 * Tự động xóa cache cũ để tránh memory leak.
 */

const store = new Map(); // key → { data, expireAt }

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 phút

/**
 * Lấy giá trị từ cache.
 * @returns {any|null} Dữ liệu hoặc null nếu cache miss / hết hạn
 */
const get = (key) => {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expireAt) {
    store.delete(key);
    return null;
  }
  return entry.data;
};

/**
 * Lưu giá trị vào cache.
 * @param {string} key
 * @param {any} data
 * @param {number} ttlMs - Thời gian sống (ms). Mặc định 5 phút.
 */
const set = (key, data, ttlMs = DEFAULT_TTL_MS) => {
  store.set(key, { data, expireAt: Date.now() + ttlMs });
};

/**
 * Xóa tất cả cache có key bắt đầu bằng prefix.
 * @param {string} prefix
 */
const delByPrefix = (prefix) => {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
};

/**
 * Xóa một key cụ thể.
 */
const del = (key) => store.delete(key);

/**
 * Xóa toàn bộ cache.
 */
const flush = () => store.clear();

/**
 * Thống kê cache (dùng để debug).
 */
const stats = () => ({
  size: store.size,
  keys: [...store.keys()],
});

// Tự dọn cache hết hạn mỗi 10 phút để tránh memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.expireAt) {
      store.delete(key);
    }
  }
}, 10 * 60 * 1000);

module.exports = { get, set, del, delByPrefix, flush, stats };
