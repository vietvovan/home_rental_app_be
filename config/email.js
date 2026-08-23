const nodemailer = require('nodemailer');

const createTransporter = () => {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER || 'beehome2207@gmail.com';
  let pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

  if (!pass) {
    return null;
  }

  // Tự động loại bỏ dấu cách nếu người dùng copy mật khẩu dạng "xxxx xxxx xxxx xxxx"
  pass = pass.replace(/\s+/g, '').trim();

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // 587 dùng STARTTLS, tương thích tốt nhất với mạng cloud của Render
    family: 4,     // BẮT BUỘC: Ép buộc dùng IPv4, khắc phục triệt để lỗi ENETUNREACH (IPv6) trên Render
    auth: {
      user: user.trim(),
      pass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: false,
    },
  });
};

const sendContactEmail = async ({ name, phone, email, subject, message }) => {
  const receiverEmail = process.env.CONTACT_RECEIVER_EMAIL || 'beehome2207@gmail.com';
  const transporter = createTransporter();

  if (!transporter) {
    console.warn(`⚠️ [Email Service] Chưa cấu hình EMAIL_PASS trong .env. Tin nhắn liên hệ đã được lưu vào hệ thống Leads nhưng chưa thể gửi mail tới ${receiverEmail}.`);
    console.warn(`👉 Hướng dẫn: Thêm EMAIL_USER=beehome2207@gmail.com và EMAIL_PASS=<mật khẩu ứng dụng 16 ký tự của Gmail> vào file .env.`);
    return { sent: false, reason: 'Chưa cấu hình mật khẩu ứng dụng Gmail (EMAIL_PASS)' };
  }

  const mailOptions = {
    from: `"BEEHOME Website" <${process.env.EMAIL_USER || 'beehome2207@gmail.com'}>`,
    to: receiverEmail,
    replyTo: email || undefined,
    subject: `[BEEHOME Liên Hệ Mới] ${subject ? `${subject} - ` : ''}từ ${name}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 30px 24px; text-align: center; border-bottom: 3px solid #0D9488;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">BEEHOME VIỆT NAM</h1>
          <p style="color: #0D9488; margin: 6px 0 0 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Yêu Cầu Liên Hệ & Tư Vấn Mới</p>
        </div>

        <!-- Body Content -->
        <div style="padding: 28px 24px;">
          <p style="color: #334155; font-size: 15px; line-height: 1.6; margin-top: 0;">
            Hệ thống vừa ghi nhận một thông tin liên hệ mới từ khách hàng qua trang <strong>Giới thiệu & Liên hệ</strong> trên website.
          </p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f8fafc; border-radius: 12px; overflow: hidden;">
            <tbody>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 14px 16px; font-weight: 600; color: #475569; width: 35%; font-size: 14px;">Họ và tên:</td>
                <td style="padding: 14px 16px; font-weight: 700; color: #0F172A; font-size: 15px;">${name}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 14px 16px; font-weight: 600; color: #475569; font-size: 14px;">Số điện thoại:</td>
                <td style="padding: 14px 16px; font-weight: 700; color: #0D9488; font-size: 15px;">
                  <a href="tel:${phone}" style="color: #0D9488; text-decoration: none;">${phone}</a>
                </td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 14px 16px; font-weight: 600; color: #475569; font-size: 14px;">Email:</td>
                <td style="padding: 14px 16px; color: #334155; font-size: 14px;">
                  ${email ? `<a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a>` : '<em style="color: #94a3b8;">Không cung cấp</em>'}
                </td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 14px 16px; font-weight: 600; color: #475569; font-size: 14px;">Chủ đề yêu cầu:</td>
                <td style="padding: 14px 16px; color: #0F172A; font-weight: 600; font-size: 14px;">${subject || 'Tư vấn thuê nhà'}</td>
              </tr>
              <tr>
                <td style="padding: 14px 16px; font-weight: 600; color: #475569; font-size: 14px;">Thời gian gửi:</td>
                <td style="padding: 14px 16px; color: #64748b; font-size: 13px;">${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</td>
              </tr>
            </tbody>
          </table>

          <div style="background-color: #f1f5f9; border-left: 4px solid #0D9488; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-weight: 700; color: #1e293b; font-size: 14px;">Nội dung tin nhắn:</p>
            <p style="margin: 0; color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          </div>

          <div style="text-align: center; margin-top: 28px;">
            <a href="tel:${phone}" style="display: inline-block; background-color: #0D9488; color: #ffffff; font-weight: 600; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-size: 14px; box-shadow: 0 2px 4px rgba(13, 148, 136, 0.3);">
              📞 Gọi lại cho khách hàng ngay
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">Email tự động gửi từ Cổng thông tin BEEHOME · 168 Phúc Minh, Phú Diễn, Hà Nội</p>
        </div>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
};

module.exports = {
  sendContactEmail,
};
