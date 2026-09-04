const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Cấu hình Cloudinary từ biến môi trường
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- Storage cho ảnh BĐS (Properties) ---
const propertyStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'nexthome/properties',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 1200, height: 800, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }
    ],
  },
});

// --- Storage cho ảnh Blog ---
const blogStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'nexthome/blogs',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 1200, height: 630, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }
    ],
  },
});

// Giới hạn file: tối đa 10MB mỗi ảnh
const fileSizeLimit = 10 * 1024 * 1024;

const uploadProperty = multer({
  storage: propertyStorage,
  limits: { fileSize: fileSizeLimit },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh (JPG, PNG, WebP)'), false);
    }
  },
});

const uploadBlog = multer({
  storage: blogStorage,
  limits: { fileSize: fileSizeLimit },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh (JPG, PNG, WebP)'), false);
    }
  },
});

// Hàm xóa ảnh khỏi Cloudinary theo public_id
const deleteFromCloudinary = async (imageUrl) => {
  try {
    if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.includes('cloudinary.com')) return null;
    // Trích xuất public_id từ URL Cloudinary
    const parts = imageUrl.split('/');
    const filenameWithExt = parts[parts.length - 1];
    const filename = filenameWithExt.split('.')[0];
    const folderIndex = parts.indexOf('nexthome');
    const publicId = folderIndex !== -1
      ? `nexthome/${parts[folderIndex + 1]}/${filename}`
      : filename;
    return await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('[Cloudinary] Lỗi xóa ảnh:', err.message);
    return null;
  }
};

module.exports = { uploadProperty, uploadBlog, deleteFromCloudinary, cloudinary };
