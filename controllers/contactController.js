const { Lead } = require('../models');
const { sendContactEmail } = require('../config/email');

// @desc    Submit contact inquiry and send notification email to beehome2207@gmail.com
// @route   POST /api/contact
// @access  Public
const submitContact = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập họ và tên của bạn.' });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập số điện thoại liên hệ.' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập nội dung tin nhắn.' });
    }

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email ? email.trim() : '';
    const cleanSubject = subject ? subject.trim() : 'Tư vấn thuê nhà';
    const cleanMessage = message.trim();

    // 1. Lưu khách hàng tiềm năng vào hệ thống Leads (Lead CRM)
    try {
      await Lead.create({
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail || `${cleanPhone}@lienhe.beehome.vn`,
        status: 'Mới',
        notes: `[Liên hệ Giới thiệu - Chủ đề: ${cleanSubject}] ${cleanMessage}`,
      });
    } catch (leadError) {
      console.warn('⚠️ [Contact] Không thể lưu Lead vào DB:', leadError.message);
    }

    // 2. Gửi phản hồi ngay lập tức cho Frontend để tránh pending / timeout
    res.status(200).json({
      success: true,
      message: 'Tin nhắn của bạn đã được gửi thành công. BEEHOME sẽ liên hệ với bạn trong thời gian sớm nhất!',
    });

    // 3. Gửi email thông báo chạy nền (Background Non-blocking)
    sendContactEmail({
      name: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      subject: cleanSubject,
      message: cleanMessage,
    }).then(() => {
      console.log('✅ [Email Service] Đã gửi email thông báo liên hệ tới beehome2207@gmail.com');
    }).catch((emailError) => {
      console.error('⚠️ [Email Service] Lỗi khi gửi email:', emailError.message);
    });
  } catch (error) {
    console.error('❌ [Contact Error]:', error);
    res.status(500).json({ message: 'Đã có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại sau.' });
  }
};

module.exports = {
  submitContact,
};
