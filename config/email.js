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
 * Hàm điều phối gửi email liên hệ (Trang Giới Thiệu & Liên Hệ)
 */
const sendContactEmail = async ({ name, phone, email, subject, message }) => {
  const receiverEmail = process.env.CONTACT_RECEIVER_EMAIL || 'beehome2207@gmail.com';

  const safeName = escapeHtml(name);
  const safePhone = escapeHtml(phone);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject || 'Tư vấn thuê nhà');
  const safeMessage = escapeHtml(message);
  const sentTime = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  const mailSubject = `[BEEHOME Liên Hệ Mới] ${safeSubject} - từ ${safeName}`;

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <div style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 28px 24px; text-align: center; border-bottom: 3px solid #0D9488;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">BEEHOME VIỆT NAM</h1>
        <p style="color: #0D9488; margin: 6px 0 0 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Yêu Cầu Liên Hệ & Tư Vấn Mới</p>
      </div>

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

      <div style="background-color: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">Email tự động từ Cổng thông tin BEEHOME · 168 Phúc Minh, Phú Diễn, Hà Nội</p>
      </div>
    </div>
  `;

  // 1. Resend HTTPS API
  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'BEEHOME <onboarding@resend.dev>',
          to: [receiverEmail],
          reply_to: email || undefined,
          subject: mailSubject,
          html: htmlContent,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ [Email Service] Gửi mail liên hệ thành công qua Resend tới: ${receiverEmail}`);
        return { sent: true, method: 'resend', data };
      }
    } catch (resendErr) {
      console.warn(`⚠️ [Email Service] Gửi qua Resend API gặp sự cố:`, resendErr.message);
    }
  }

  // 2. Gmail SMTP fallback
  const transporter = createGmailTransporter();
  if (transporter) {
    const info = await transporter.sendMail({
      from: `"BEEHOME Website" <${process.env.EMAIL_USER || 'beehome2207@gmail.com'}>`,
      to: receiverEmail,
      replyTo: email || undefined,
      subject: mailSubject,
      html: htmlContent,
    });
    console.log(`✅ [Email Service] Gửi mail liên hệ thành công qua Gmail SMTP tới: ${receiverEmail}`);
    return { sent: true, method: 'smtp', info };
  }

  return { sent: false, reason: 'Chưa cấu hình thông tin gửi email' };
};

/**
 * Hàm điều phối gửi email Đặt Lịch Xem Nhà (Trang Chi Tiết Nhà)
 */
const sendViewingBookingEmail = async ({ name, phone, email, viewingDate, notes, property }) => {
  const receiverEmail = process.env.CONTACT_RECEIVER_EMAIL || 'beehome2207@gmail.com';

  const safeName = escapeHtml(name);
  const safePhone = escapeHtml(phone);
  const safeEmail = escapeHtml(email);
  const safeDate = escapeHtml(viewingDate || 'Liên hệ hẹn thời gian sớm nhất');
  const safeNotes = escapeHtml(notes || 'Không có ghi chú thêm');
  const sentTime = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  // Thông tin căn nhà
  const propTitle = escapeHtml(property?.title || 'Bất động sản cho thuê');
  const propId = property?.id || 'N/A';
  const propAddress = escapeHtml(property?.address || 'Chưa cập nhật');
  const propPrice = property?.price ? `${Number(property.price).toLocaleString('vi-VN')}₫/tháng` : 'Thương lượng';
  const propDeposit = property?.deposit ? `${Number(property.deposit).toLocaleString('vi-VN')}₫` : 'Thương lượng';
  const propSpecs = `${property?.type || 'Căn hộ'} · ${property?.area || 0}m² · ${property?.beds || 0} PN, ${property?.baths || 0} WC`;
  const propStatus = escapeHtml(property?.status || 'Còn trống');
  const propImage = property?.image || '';

  const subject = `[BEEHOME Đặt Lịch Xem Nhà #${propId}] ${propTitle} - Khách: ${safeName} (${safePhone})`;

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 28px 24px; text-align: center; border-bottom: 3px solid #0D9488;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">BEEHOME VIỆT NAM</h1>
        <p style="color: #0D9488; margin: 6px 0 0 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Yêu Cầu Đặt Lịch Xem Nhà Mới</p>
      </div>

      <div style="padding: 28px 24px;">
        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-top: 0;">
          Khách hàng vừa gửi yêu cầu đặt lịch hẹn xem nhà trực tiếp trên website BEEHOME:
        </p>

        <!-- Khối Thông Tin Khách Hàng -->
        <div style="background-color: #f8fafc; border-radius: 12px; padding: 18px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
          <h3 style="color: #0F172A; font-size: 15px; margin: 0 0 12px 0;">
            👤 THÔNG TIN KHÁCH HÀNG
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tbody>
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 38%;">Họ và tên:</td>
                <td style="padding: 6px 0; color: #0F172A; font-weight: 700;">${safeName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Số điện thoại:</td>
                <td style="padding: 6px 0; color: #0D9488; font-weight: 700;">
                  <a href="tel:${safePhone}" style="color: #0D9488; text-decoration: none;">${safePhone}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Email:</td>
                <td style="padding: 6px 0; color: #334155;">
                  ${safeEmail ? `<a href="mailto:${safeEmail}" style="color: #2563eb; text-decoration: none;">${safeEmail}</a>` : '<em style="color: #94a3b8;">Không cung cấp</em>'}
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Ngày hẹn xem:</td>
                <td style="padding: 6px 0; color: #b45309; font-weight: 700;">🗓️ ${safeDate}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Mô tả / Ghi chú:</td>
                <td style="padding: 6px 0; color: #334155; font-style: italic;">"${safeNotes}"</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Thời gian đặt:</td>
                <td style="padding: 6px 0; color: #64748b;">${sentTime}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Khối Thông Tin Bất Động Sản -->
        <div style="background-color: #f0fdfa; border-radius: 12px; padding: 18px; margin-bottom: 24px; border: 1px solid #ccfbf1;">
          <h3 style="color: #0f766e; font-size: 15px; margin: 0 0 12px 0;">
            🏠 THÔNG TIN CĂN NHÀ ĐẶT XEM (Mã #${propId})
          </h3>
          ${propImage ? `
            <div style="margin-bottom: 14px; border-radius: 8px; overflow: hidden; height: 160px;">
              <img src="${propImage}" alt="${propTitle}" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
          ` : ''}
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tbody>
              <tr>
                <td style="padding: 6px 0; color: #475569; width: 38%;">Tên căn hộ/nhà:</td>
                <td style="padding: 6px 0; color: #0F172A; font-weight: 700;">${propTitle}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #475569;">Địa chỉ:</td>
                <td style="padding: 6px 0; color: #334155;">${propAddress}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #475569;">Giá thuê:</td>
                <td style="padding: 6px 0; color: #0D9488; font-weight: 700; font-size: 15px;">${propPrice}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #475569;">Tiền đặt cọc:</td>
                <td style="padding: 6px 0; color: #0F172A; font-weight: 600;">${propDeposit}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #475569;">Thông số căn:</td>
                <td style="padding: 6px 0; color: #334155;">${propSpecs}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #475569;">Trạng thái:</td>
                <td style="padding: 6px 0; color: #059669; font-weight: 600;">${propStatus}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Nút gọi ngay -->
        <div style="text-align: center;">
          <a href="tel:${safePhone}" style="display: inline-block; background-color: #0D9488; color: #ffffff; font-weight: 600; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(13, 148, 136, 0.3);">
            📞 Gọi xác nhận lịch xem cho khách: ${safePhone}
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">Email tự động từ Cổng thông tin BEEHOME · 168 Phúc Minh, Phú Diễn, Hà Nội</p>
      </div>
    </div>
  `;

  // 1. Resend HTTPS API
  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'BEEHOME <onboarding@resend.dev>',
          to: [receiverEmail],
          reply_to: email || undefined,
          subject,
          html: htmlContent,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ [Email Service] Gửi mail đặt lịch thành công qua Resend tới: ${receiverEmail}`);
        return { sent: true, method: 'resend', data };
      }
    } catch (resendErr) {
      console.warn(`⚠️ [Email Service] Gửi đặt lịch qua Resend API gặp sự cố:`, resendErr.message);
    }
  }

  // 2. Gmail SMTP fallback
  const transporter = createGmailTransporter();
  if (transporter) {
    const info = await transporter.sendMail({
      from: `"BEEHOME Website" <${process.env.EMAIL_USER || 'beehome2207@gmail.com'}>`,
      to: receiverEmail,
      replyTo: email || undefined,
      subject,
      html: htmlContent,
    });
    console.log(`✅ [Email Service] Gửi mail đặt lịch thành công qua Gmail SMTP tới: ${receiverEmail}`);
    return { sent: true, method: 'smtp', info };
  }

  return { sent: false, reason: 'Chưa cấu hình thông tin gửi email' };
};

module.exports = {
  sendContactEmail,
  sendViewingBookingEmail,
};
