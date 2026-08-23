const nodemailer = require('nodemailer');
const dns = require('dns');

// Ép buộc toàn bộ tiến trình Node.js ưu tiên IPv4 (tránh lỗi ENETUNREACH trên Render/Cloud)
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

/**
 * Hàm chống tấn công HTML Injection / XSS trong nội dung email
 */
const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Gửi email qua HTTPS REST API của Resend (Port 443 - Chuẩn nhất trên Render Free / Vercel)
 */
const sendViaResendHttp = async ({ name, phone, email, subject, message, receiverEmail }) => {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return false;

  const safeName = escapeHtml(name);
  const safePhone = escapeHtml(phone);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject || 'Tư vấn thuê nhà');
  const safeMessage = escapeHtml(message);
  const sentTime = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 28px 24px; text-align: center; border-bottom: 3px solid #0D9488;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">BEEHOME VIỆT NAM</h1>
        <p style="color: #0D9488; margin: 6px 0 0 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Yêu Cầu Liên Hệ & Tư Vấn Mới</p>
      </div>

      <!-- Body -->
      <div style="padding: 28px 24px;">
        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-top: 0;">
          Hệ thống vừa ghi nhận một thông tin liên hệ mới từ khách hàng qua trang <strong>Giới thiệu & Liên hệ</strong> trên website.
        </p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f8fafc; border-radius: 12px; overflow: hidden;">
          <tbody>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px 16px; font-weight: 600; color: #475569; width: 35%; font-size: 14px;">Họ và tên:</td>
              <td style="padding: 12px 16px; font-weight: 700; color: #0F172A; font-size: 15px;">${safeName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px 16px; font-weight: 600; color: #475569; font-size: 14px;">Số điện thoại:</td>
              <td style="padding: 12px 16px; font-weight: 700; color: #0D9488; font-size: 15px;">
                <a href="tel:${safePhone}" style="color: #0D9488; text-decoration: none;">${safePhone}</a>
              </td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px 16px; font-weight: 600; color: #475569; font-size: 14px;">Email:</td>
              <td style="padding: 12px 16px; color: #334155; font-size: 14px;">
                ${safeEmail ? `<a href="mailto:${safeEmail}" style="color: #2563eb; text-decoration: none;">${safeEmail}</a>` : '<em style="color: #94a3b8;">Không cung cấp</em>'}
              </td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px 16px; font-weight: 600; color: #475569; font-size: 14px;">Chủ đề:</td>
              <td style="padding: 12px 16px; color: #0F172A; font-weight: 600; font-size: 14px;">${safeSubject}</td>
            </tr>
            <tr>
              <td style="padding: 12px 16px; font-weight: 600; color: #475569; font-size: 14px;">Thời gian:</td>
              <td style="padding: 12px 16px; color: #64748b; font-size: 13px;">${sentTime}</td>
            </tr>
          </tbody>
        </table>

        <div style="background-color: #f1f5f9; border-left: 4px solid #0D9488; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-weight: 700; color: #1e293b; font-size: 14px;">Nội dung tin nhắn:</p>
          <p style="margin: 0; color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${safeMessage}</p>
        </div>

        <div style="text-align: center; margin-top: 24px;">
          <a href="tel:${safePhone}" style="display: inline-block; background-color: #0D9488; color: #ffffff; font-weight: 600; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-size: 14px; box-shadow: 0 2px 4px rgba(13, 148, 136, 0.3);">
            📞 Gọi lại cho khách hàng: ${safePhone}
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">Email tự động từ Cổng thông tin BEEHOME · 168 Phúc Minh, Phú Diễn, Hà Nội</p>
      </div>
    </div>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'BEEHOME <onboarding@resend.dev>',
      to: [receiverEmail],
      reply_to: email || undefined,
      subject: `[BEEHOME Liên Hệ Mới] ${subject ? `${subject} - ` : ''}từ ${name}`,
      html: htmlContent,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || JSON.stringify(data));
  }

  return data;
};

/**
 * Tạo Nodemailer Transporter với ép buộc IPv4 (Dành cho VPS / Local)
 */
const createGmailTransporter = () => {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER || 'beehome2207@gmail.com';
  let pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

  if (!pass) return null;
  pass = pass.replace(/\s+/g, '').trim();

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: user.trim(),
      pass,
    },
    lookup: (hostname, options, callback) => {
      dns.lookup(hostname, { family: 4 }, (err, address) => {
        if (err) return callback(err);
        callback(null, address, 4);
      });
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
    tls: {
      rejectUnauthorized: false,
    },
  });
};

/**
 * Hàm điều phối gửi email liên hệ chính
 */
const sendContactEmail = async ({ name, phone, email, subject, message }) => {
  const receiverEmail = process.env.CONTACT_RECEIVER_EMAIL || 'beehome2207@gmail.com';

  // 1. Phương án ưu tiên: Resend HTTPS REST API (Hoạt động 100% trên Render Free qua Port 443)
  if (process.env.RESEND_API_KEY) {
    try {
      const result = await sendViaResendHttp({ name, phone, email, subject, message, receiverEmail });
      console.log(`✅ [Email Service] Gửi mail thành công qua Resend HTTPS API tới: ${receiverEmail}`);
      return { sent: true, method: 'resend', result };
    } catch (resendErr) {
      console.warn(`⚠️ [Email Service] Gửi qua Resend API gặp sự cố:`, resendErr.message);
    }
  }

  // 2. Phương án dự phòng: Gmail SMTP với ép buộc IPv4
  const transporter = createGmailTransporter();
  if (!transporter) {
    console.warn(`⚠️ [Email Service] Chưa cấu hình RESEND_API_KEY hoặc EMAIL_PASS trong .env. Tin nhắn đã được lưu vào hệ thống Leads.`);
    return { sent: false, reason: 'Chưa cấu hình API Key hoặc mật khẩu email' };
  }

  const safeName = escapeHtml(name);
  const safePhone = escapeHtml(phone);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject || 'Tư vấn thuê nhà');
  const safeMessage = escapeHtml(message);
  const sentTime = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  const mailOptions = {
    from: `"BEEHOME Website" <${process.env.EMAIL_USER || 'beehome2207@gmail.com'}>`,
    to: receiverEmail,
    replyTo: email || undefined,
    subject: `[BEEHOME Liên Hệ Mới] ${subject ? `${subject} - ` : ''}từ ${name}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: #0F172A; padding: 24px; text-align: center; border-bottom: 3px solid #0D9488;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px;">BEEHOME VIỆT NAM</h1>
          <p style="color: #0D9488; margin: 4px 0 0 0; font-size: 13px;">Yêu Cầu Liên Hệ Mới</p>
        </div>
        <div style="padding: 24px;">
          <p><strong>Khách hàng:</strong> ${safeName}</p>
          <p><strong>Số điện thoại:</strong> <a href="tel:${safePhone}">${safePhone}</a></p>
          <p><strong>Email:</strong> ${safeEmail || 'Không có'}</p>
          <p><strong>Chủ đề:</strong> ${safeSubject}</p>
          <p><strong>Thời gian:</strong> ${sentTime}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
          <p><strong>Nội dung:</strong></p>
          <p style="white-space: pre-wrap; background: #f8fafc; padding: 12px; border-radius: 8px;">${safeMessage}</p>
        </div>
      </div>
    `,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`✅ [Email Service] Gửi mail thành công qua Gmail SMTP tới: ${receiverEmail}`);
  return { sent: true, method: 'smtp', info };
};

module.exports = {
  sendContactEmail,
};
