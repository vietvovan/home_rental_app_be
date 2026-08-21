-- Xóa cơ sở dữ liệu nếu đã tồn tại và tạo mới
DROP DATABASE IF EXISTS next_home_db;
CREATE DATABASE next_home_db;
USE next_home_db;

-- Bảng Users / TeamMembers
CREATE TABLE `Users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `passwordHash` VARCHAR(255) NOT NULL,
  `role` ENUM('Admin', 'Manager', 'Broker', 'CTV') NOT NULL DEFAULT 'Broker',
  `phone` VARCHAR(50),
  `isActive` BOOLEAN DEFAULT TRUE,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Bảng Properties
CREATE TABLE `Properties` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `address` VARCHAR(255) NOT NULL,
  `price` DECIMAL(15, 2) NOT NULL,
  `deposit` DECIMAL(15, 2) NOT NULL,
  `beds` INT NOT NULL,
  `baths` INT NOT NULL,
  `area` DECIMAL(10, 2) NOT NULL,
  `type` ENUM('Penthouse', 'Loft', 'Biệt thự', 'Studio', 'Chung cư', 'Nhà phố') NOT NULL,
  `status` ENUM('Còn trống', 'Đã cho thuê', 'Đang thương lượng') DEFAULT 'Còn trống',
  `image` VARCHAR(500),
  `amenities` JSON, -- Lưu dưới dạng mảng JSON
  `agentId` INT,
  `listedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `isFeatured` BOOLEAN DEFAULT FALSE,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`agentId`) REFERENCES `Users`(`id`) ON DELETE SET NULL
);

-- Bảng Leads
CREATE TABLE `Leads` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50),
  `budget` DECIMAL(15, 2),
  `area` VARCHAR(255),
  `moveInDate` DATE,
  `status` ENUM('Mới', 'Đã liên hệ', 'Đã hẹn xem', 'Đã đóng', 'Thất bại') DEFAULT 'Mới',
  `assigneeId` INT,
  `notes` TEXT,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`assigneeId`) REFERENCES `Users`(`id`) ON DELETE SET NULL
);

-- Bảng Deposits
CREATE TABLE `Deposits` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `contractNumber` VARCHAR(100) NOT NULL UNIQUE,
  `propertyId` INT NOT NULL,
  `tenantName` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `status` ENUM('Đã nhận', 'Đã hoàn trả', 'Bị giữ cọc') DEFAULT 'Đã nhận',
  `depositDate` DATE NOT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`propertyId`) REFERENCES `Properties`(`id`) ON DELETE CASCADE
);

-- Bảng BlogPosts
CREATE TABLE `BlogPosts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `excerpt` TEXT,
  `content` LONGTEXT NOT NULL,
  `category` VARCHAR(100),
  `image` VARCHAR(500),
  `authorId` INT,
  `publishedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `readTime` VARCHAR(50),
  `isFeatured` BOOLEAN DEFAULT FALSE,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`authorId`) REFERENCES `Users`(`id`) ON DELETE SET NULL
);
