const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { User } = require('../models');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

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
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ where: { email } });

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      // Kiểm tra tài khoản đã được duyệt chưa
      if (!user.isActive) {
        return res.status(403).json({ message: 'Tài khoản của bạn đang chờ Admin phê duyệt.' });
      }

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user.id),
      });
    } else {
      res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user info
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    // req.user is set in authMiddleware
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  register,
  login,
  getMe,
};
