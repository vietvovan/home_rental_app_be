const jwt = require('jsonwebtoken');
const { User } = require('../models');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Lấy token từ header
      token = req.headers.authorization.split(' ')[1];

      // Xác thực token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Gán user vào request
      req.user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['passwordHash'] }
      });

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      next();
    } catch (error) {
      // return để tránh gửi 2 response (double response bug)
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    // Không có token trong header
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

const adminOrManager = (req, res, next) => {
  if (req.user && (req.user.role === 'Admin' || req.user.role === 'Manager')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized for this action' });
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
      // Bỏ qua lỗi vì đây là optional
    }
  }
  next();
};

// Tất cả các role đã đăng nhập (Admin, Manager, Agent)
const anyStaff = (req, res, next) => {
  if (req.user) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized' });
  }
};

module.exports = { protect, optionalProtect, admin, adminOrManager, anyStaff };
