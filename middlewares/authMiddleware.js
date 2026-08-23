const jwt = require('jsonwebtoken');
const { User } = require('../models');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['passwordHash'] }
      });

      if (!req.user) {
        return res.status(401).json({ message: 'Không có quyền truy cập, không tìm thấy người dùng' });
      }

      next();
    } catch (error) {
      return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
    }
  } else {
    return res.status(401).json({ message: 'Vui lòng đăng nhập để tiếp tục' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(403).json({ message: 'Hành động yêu cầu quyền Quản Trị Viên (Admin)' });
  }
};

const adminOrManager = (req, res, next) => {
  if (req.user && (req.user.role === 'Admin' || req.user.role === 'Manager')) {
    next();
  } else {
    res.status(403).json({ message: 'Hành động yêu cầu quyền Admin hoặc Manager' });
  }
};

const optionalProtect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['passwordHash'] }
      });
    } catch (error) {
      // Optional, ignore invalid token
    }
  }
  next();
};

const anyStaff = (req, res, next) => {
  if (req.user) {
    next();
  } else {
    res.status(403).json({ message: 'Yêu cầu đăng nhập tài khoản nhân viên' });
  }
};

module.exports = { protect, optionalProtect, admin, adminOrManager, anyStaff };
