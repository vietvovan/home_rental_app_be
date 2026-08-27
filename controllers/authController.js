const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { User } = require('../models');

// Generate JWT
const generateToken = (id, rememberMe = true) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: rememberMe ? '30d' : '1d',
  });
};

// Transporter email
const createTransporter = async () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback: create test account on Ethereal for local testing
  try {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  } catch {
    return null;
  }
};

// Generate random password helper
function generateRandomPassword(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  let password = 'NH@';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    if (!name || !email || !password || !phone || !address) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ họ tên, email, mật khẩu, số điện thoại và địa chỉ.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải có tối thiểu 6 ký tự.' });
    }

    // Check if user exists
    const userExists = await User.findOne({ where: { email: email.trim().toLowerCase() } });
    if (userExists) {
      return res.status(400).json({ message: 'Email này đã tồn tại trong hệ thống.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user - Always force role to Agent to prevent Privilege Escalation
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: 'Agent',
      phone: phone.trim(),
      address: address.trim(),
      isActive: false, // Người dùng tự đăng ký mặc định là chưa kích hoạt (chờ Admin duyệt)
    });

    if (user) {
      // Trả về response báo thành công nhưng không có token
      res.status(201).json({
        message: 'Đăng ký thành công. Tài khoản của bạn đang chờ Admin duyệt.',
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    // Check for user email
    const user = await User.findOne({ where: { email: email ? email.trim().toLowerCase() : '' } });

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      // Kiểm tra tài khoản đã được duyệt chưa
      if (!user.isActive) {
        return res.status(403).json({ message: 'Tài khoản của bạn đang chờ Admin phê duyệt.' });
      }

      const shouldRemember = rememberMe !== false;

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        rememberMe: shouldRemember,
        token: generateToken(user.id, shouldRemember),
      });
    } else {
      res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Forgot Password - Generate and send new password to email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập địa chỉ email.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ where: { email: cleanEmail } });

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản với email này.' });
    }

    // Tạo mật khẩu mới ngẫu nhiên
    const newPassword = generateRandomPassword(8);

    // Băm và cập nhật mật khẩu mới vào cơ sở dữ liệu
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    await user.update({ passwordHash });

    // Gửi email chứa mật khẩu mới
    try {
      const transporter = await createTransporter();
      if (transporter) {
        const info = await transporter.sendMail({
          from: process.env.SMTP_FROM || `"BeeHome" <${process.env.SMTP_USER || 'no-reply@beehome.vn'}>`,
          to: user.email,
          subject: '[BeeHome] Mật khẩu mới cho tài khoản của bạn',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
              <div style="background-color: #0F172A; padding: 18px; border-radius: 12px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 900; letter-spacing: 1px;">BEE<span style="color: #F59E0B;">HOME</span></h1>
              </div>
              <h2 style="color: #0F172A; font-size: 18px; margin-top: 24px; font-weight: bold;">Cấp lại mật khẩu thành công</h2>
              <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                Xin chào <strong>${user.name}</strong>,<br/>
                Hệ thống đã nhận được yêu cầu cấp lại mật khẩu cho tài khoản <strong>${user.email}</strong>.
              </p>
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                <p style="color: #166534; font-size: 13px; margin: 0 0 8px 0; font-weight: bold; text-transform: uppercase;">Mật khẩu mới của bạn là:</p>
                <div style="background-color: #ffffff; border: 1px dashed #16a34a; border-radius: 8px; padding: 10px 24px; display: inline-block;">
                  <span style="color: #0f172a; font-size: 24px; font-weight: 900; letter-spacing: 2px; font-family: Consolas, monospace;">${newPassword}</span>
                </div>
              </div>
              <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
                👉 <strong>Lưu ý:</strong> Vui lòng sử dụng mật khẩu trên để đăng nhập lại vào hệ thống. Để bảo vệ an toàn cho tài khoản, hãy đổi mật khẩu mới trong phần cài đặt sau khi đăng nhập.
              </p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
              <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
                © 2025 BeeHome Property Management. Đây là email tự động, vui lòng không phản hồi.
              </p>
            </div>
          `,
        });
        console.log(`✅ [Email] Đã gửi mật khẩu mới cho ${user.email}. MessageId: ${info.messageId}`);
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          console.log(`🔗 [Email Preview] Xem email tại: ${previewUrl}`);
        }
      }
    } catch (mailErr) {
      console.error('Lỗi khi gửi email:', mailErr);
    }

    res.json({
      success: true,
      message: `Mật khẩu mới đã được gửi tới email ${user.email}. Vui lòng kiểm tra hộp thư để đăng nhập!`,
    });
  } catch (error) {
    console.error('Lỗi quên mật khẩu:', error);
    res.status(500).json({ message: error.message || 'Lỗi xử lý yêu cầu quên mật khẩu.' });
  }
};

// @desc    Change Password for current user
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có độ dài tối thiểu 6 ký tự.' });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Mật khẩu xác nhận không khớp với mật khẩu mới.' });
    }

    // Tìm user kèm passwordHash
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin tài khoản người dùng.' });
    }

    // Kiểm tra mật khẩu hiện tại
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại không chính xác. Vui lòng kiểm tra lại.' });
    }

    // Kiểm tra mật khẩu mới có trùng mật khẩu cũ không
    const isSame = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSame) {
      return res.status(400).json({ message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại.' });
    }

    // Mã hóa mật khẩu mới và lưu
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    await user.update({ passwordHash });

    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công! Vui lòng ghi nhớ mật khẩu mới của bạn.',
    });
  } catch (error) {
    console.error('Lỗi đổi mật khẩu:', error);
    res.status(500).json({ message: error.message || 'Lỗi hệ thống khi đổi mật khẩu.' });
  }
};

// @desc    Get current user info
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  changePassword,
  getMe,
};
