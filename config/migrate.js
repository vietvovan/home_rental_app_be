const sequelize = require('./db');

/**
 * Tự động kiểm tra và cập nhật cấu trúc database MySQL / TiDB
 * Chạy TRƯỚC KHI sequelize.sync() để:
 * 1. Thêm cột `isPublished` và các cột mới vào bảng Properties (tránh lỗi column does not exist: isPublished khi sync tạo index)
 * 2. Đổi các cột ENUM cũ sang VARCHAR(100) (tránh lỗi Data truncated for column 'status')
 */
async function autoMigrate() {
  try {
    // 1. Lấy danh sách bảng hiện tại trong DB
    const [tablesResult] = await sequelize.query('SHOW TABLES');
    const tableNames = tablesResult.map(row => Object.values(row)[0]);

    const propTable = tableNames.find(t => t.toLowerCase() === 'properties');

    if (propTable) {
      // Lấy danh sách các cột hiện có trong bảng Properties
      const [colsResult] = await sequelize.query(`SHOW COLUMNS FROM \`${propTable}\``);
      const existingCols = colsResult.map(c => c.Field);

      // Thêm cột isPublished (đặc biệt quan trọng vì có index isPublished trong model)
      if (!existingCols.includes('isPublished')) {
        try {
          await sequelize.query(`ALTER TABLE \`${propTable}\` ADD COLUMN \`isPublished\` TINYINT(1) NOT NULL DEFAULT 1`);
          console.log(`✅ [AutoMigrate] Đã thêm cột isPublished vào bảng ${propTable}`);
        } catch (e) {
          console.warn(`⚠️ [AutoMigrate] Thêm cột isPublished:`, e.message);
        }
      }

      // Danh sách các cột bổ sung cần đảm bảo tồn tại
      const columnsToAdd = [
        { name: 'commission', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`commission\` DECIMAL(15,2) DEFAULT 0` },
        { name: 'videoUrl', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`videoUrl\` VARCHAR(500) NULL` },
        { name: 'availability', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`availability\` DATE NULL` },
        { name: 'leaseTerm', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`leaseTerm\` VARCHAR(255) NULL` },
        { name: 'furnishing', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`furnishing\` VARCHAR(255) NULL` },
        { name: 'statusDate', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`statusDate\` DATE NULL` },
        { name: 'elevatorType', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`elevatorType\` VARCHAR(255) DEFAULT 'Thang máy'` },
        { name: 'availableFloors', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`availableFloors\` VARCHAR(255) NULL` },
        { name: 'alleyType', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`alleyType\` VARCHAR(255) DEFAULT 'Ô tô'` },
        { name: 'hasWashingMachine', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`hasWashingMachine\` TINYINT(1) DEFAULT 1` },
        { name: 'hasDryer', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`hasDryer\` TINYINT(1) DEFAULT 0` },
        { name: 'hasEvCharging', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`hasEvCharging\` TINYINT(1) DEFAULT 0` },
        { name: 'allowPets', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`allowPets\` TINYINT(1) DEFAULT 0` },
        { name: 'maxOccupants', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`maxOccupants\` INT DEFAULT 2` },
        { name: 'maxVehicles', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`maxVehicles\` INT DEFAULT 2` },
        { name: 'allowForeigners', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`allowForeigners\` TINYINT(1) DEFAULT 1` },
        { name: 'allowCooking', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`allowCooking\` TINYINT(1) DEFAULT 1` },
        { name: 'curfew', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`curfew\` VARCHAR(255) DEFAULT 'Tự do'` },
        { name: 'liveWithHost', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`liveWithHost\` TINYINT(1) DEFAULT 0` },
        { name: 'frontage', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`frontage\` DECIMAL(10,2) NULL` },
        { name: 'length', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`length\` DECIMAL(10,2) NULL` },
        { name: 'width', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`width\` DECIMAL(10,2) NULL` },
        { name: 'allowStay', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`allowStay\` TINYINT(1) DEFAULT 0` },
        { name: 'floors', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`floors\` INT NULL` },
        { name: 'businessTypes', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`businessTypes\` JSON NULL` },
        { name: 'images', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`images\` JSON NULL` },
        { name: 'exactAddress', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`exactAddress\` VARCHAR(500) NULL` },
        { name: 'zaloGroupUrl', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`zaloGroupUrl\` VARCHAR(500) NULL` },
        { name: 'isFeatured', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`isFeatured\` TINYINT(1) DEFAULT 0` },
        { name: 'serviceFees', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`serviceFees\` JSON NULL` },
        { name: 'description', sql: `ALTER TABLE \`${propTable}\` ADD COLUMN \`description\` LONGTEXT NULL` },
      ];

      for (const item of columnsToAdd) {
        if (!existingCols.includes(item.name)) {
          try {
            await sequelize.query(item.sql);
            console.log(`✅ [AutoMigrate] Đã thêm cột ${item.name} vào bảng ${propTable}`);
          } catch (e) {
            console.warn(`⚠️ [AutoMigrate] Thêm cột ${item.name}:`, e.message);
          }
        }
      }

      // Chuyển status và type từ ENUM sang VARCHAR để không bị lỗi truncate
      try {
        await sequelize.query(`ALTER TABLE \`${propTable}\` MODIFY COLUMN \`status\` VARCHAR(100) DEFAULT 'Đang trống'`);
        console.log(`✅ [AutoMigrate] Đã cập nhật ${propTable}.status sang VARCHAR(100)`);
      } catch (err) {
        console.warn(`⚠️ [AutoMigrate] Cập nhật ${propTable}.status:`, err.message);
      }

      try {
        await sequelize.query(`ALTER TABLE \`${propTable}\` MODIFY COLUMN \`type\` VARCHAR(100) DEFAULT 'Phòng trọ'`);
        console.log(`✅ [AutoMigrate] Đã cập nhật ${propTable}.type sang VARCHAR(100)`);
      } catch (err) {
        console.warn(`⚠️ [AutoMigrate] Cập nhật ${propTable}.type:`, err.message);
      }
    }

    // 2. Kiểm tra bảng Leads
    const leadTable = tableNames.find(t => t.toLowerCase() === 'leads');
    if (leadTable) {
      try {
        await sequelize.query(`ALTER TABLE \`${leadTable}\` MODIFY COLUMN \`status\` VARCHAR(100) DEFAULT 'Đã hẹn xem'`);
        console.log(`✅ [AutoMigrate] Đã cập nhật ${leadTable}.status sang VARCHAR(100)`);
      } catch (err) {
        console.warn(`⚠️ [AutoMigrate] Cập nhật ${leadTable}.status:`, err.message);
      }
    }

    // 3. Kiểm tra bảng Deposits
    const depositTable = tableNames.find(t => t.toLowerCase() === 'deposits');
    if (depositTable) {
      try {
        await sequelize.query(`ALTER TABLE \`${depositTable}\` MODIFY COLUMN \`status\` VARCHAR(100) DEFAULT 'Đã nhận'`);
        console.log(`✅ [AutoMigrate] Đã cập nhật ${depositTable}.status sang VARCHAR(100)`);
      } catch (err) {
        console.warn(`⚠️ [AutoMigrate] Cập nhật ${depositTable}.status:`, err.message);
      }
    }

    console.log('✅ [AutoMigrate] Hoàn tất di trú và đồng bộ cấu trúc database.');
  } catch (error) {
    console.error('❌ [AutoMigrate Error]', error.message);
  }
}

module.exports = autoMigrate;
