/**
 * reminderScheduler.js
 * Nhắc nhở lịch hẹn xem nhà bằng cách poll DB mỗi 15 phút (không cần BullMQ hay Redis).
 * Gửi reminder 1 ngày trước và 1 giờ trước lịch hẹn.
 * Chạy trong process Node.js — tự động khởi động cùng server.
 */

const { Lead } = require('../models');
const cache = require('./memCache');

const POLL_INTERVAL_MS = 15 * 60 * 1000; // 15 phút

/**
 * Kiểm tra xem có lịch hẹn nào sắp đến không và log nhắc nhở.
 * Trong thực tế: thay log bằng nodemailer / SMS API.
 */
const checkUpcomingViewings = async () => {
  try {
    const now = new Date();
    const in1h   = new Date(now.getTime() + 60 * 60 * 1000);
    const in24h  = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Lấy leads có lịch hẹn (scheduledViewings không rỗng)
    const leads = await Lead.findAll({
      where: { status: ['Đã hẹn xem', 'Đang theo dõi'] },
      attributes: ['id', 'name', 'phone', 'email', 'scheduledViewings'],
    });

    for (const lead of leads) {
      let viewings = [];
      try {
        viewings = typeof lead.scheduledViewings === 'string'
          ? JSON.parse(lead.scheduledViewings)
          : (lead.scheduledViewings || []);
      } catch { continue; }

      if (!Array.isArray(viewings)) continue;

      for (const v of viewings) {
        if (!v.dateTime) continue;
        const apptTime = new Date(v.dateTime);
        if (isNaN(apptTime.getTime())) continue;

        const msBefore = apptTime.getTime() - now.getTime();

        // Nhắc nhở 1 NGÀY trước (trong khoảng 15 phút tới)
        if (msBefore > 0 && apptTime <= in24h && apptTime > in1h) {
          const reminderKey = `reminder:24h:${lead.id}:${v.dateTime}`;
          if (!cache.get(reminderKey)) {
            console.log(`📅 [Nhắc nhở 24h] Lead #${lead.id} (${lead.name}) có lịch xem nhà lúc ${apptTime.toLocaleString('vi-VN')}`);
            // TODO: Gửi email / SMS cho lead.email / lead.phone
            cache.set(reminderKey, true, 23 * 60 * 60 * 1000); // Đánh dấu đã nhắc 23h
          }
        }

        // Nhắc nhở 1 GIỜ trước (trong khoảng 15 phút tới)
        if (msBefore > 0 && apptTime <= in1h) {
          const reminderKey = `reminder:1h:${lead.id}:${v.dateTime}`;
          if (!cache.get(reminderKey)) {
            console.log(`⏰ [Nhắc nhở 1h] Lead #${lead.id} (${lead.name}) sắp có lịch xem nhà lúc ${apptTime.toLocaleString('vi-VN')}`);
            // TODO: Gửi email / SMS cho lead.email / lead.phone
            cache.set(reminderKey, true, 2 * 60 * 60 * 1000); // Đánh dấu đã nhắc 2h
          }
        }
      }
    }
  } catch (err) {
    console.error('⚠️ [reminderScheduler] Lỗi khi kiểm tra lịch hẹn:', err.message);
  }
};

/**
 * Khởi động scheduler. Gọi hàm này 1 lần khi server start.
 */
const startReminderScheduler = () => {
  console.log('🔔 [reminderScheduler] Bộ nhắc nhở lịch hẹn đã khởi động (kiểm tra mỗi 15 phút)');
  // Chạy ngay lần đầu sau 10 giây (đợi DB connect xong)
  setTimeout(checkUpcomingViewings, 10 * 1000);
  // Sau đó lặp mỗi 15 phút
  setInterval(checkUpcomingViewings, POLL_INTERVAL_MS);
};

module.exports = { startReminderScheduler };
