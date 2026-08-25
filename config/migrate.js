const sequelize = require('./db');
const { DataTypes } = require('sequelize');

/**
 * Tự động kiểm tra và cập nhật cấu trúc database MySQL / TiDB
 * Đảm bảo các cột ENUM cũ được chuyển sang VARCHAR(100) để không bị lỗi "Data truncated for column 'status'"
 * và đảm bảo tất cả các cột mới được tự động thêm vào nếu bảng đã tồn tại từ trước.
 */
async function autoMigrate() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    // 1. Kiểm tra bảng Properties
    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map(t => typeof t === 'object' ? (t.tableName || Object.values(t)[0]) : t);

    if (tableNames.includes('Properties') || tableNames.includes('properties')) {
      const actualTableName = tableNames.includes('Properties') ? 'Properties' : 'properties';
      const columns = await queryInterface.describeTable(actualTableName);

      // Chuyển status và type từ ENUM sang VARCHAR để không bị lỗi truncate
      try {
        await sequelize.query(`ALTER TABLE \`${actualTableName}\` MODIFY COLUMN \`status\` VARCHAR(100) DEFAULT 'Đang trống'`);
        console.log('✅ [AutoMigrate] Đã cập nhật Properties.status thành VARCHAR(100)');
      } catch (err) {
        console.warn('⚠️ [AutoMigrate] Cập nhật Properties.status:', err.message);
      }

      try {
        await sequelize.query(`ALTER TABLE \`${actualTableName}\` MODIFY COLUMN \`type\` VARCHAR(100) DEFAULT 'Phòng trọ'`);
        console.log('✅ [AutoMigrate] Đã cập nhật Properties.type thành VARCHAR(100)');
      } catch (err) {
        console.warn('⚠️ [AutoMigrate] Cập nhật Properties.type:', err.message);
      }

      // Danh sách các cột cần đảm bảo tồn tại
      const requiredColumns = [
        { name: 'commission', type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
        { name: 'videoUrl', type: DataTypes.STRING(500), allowNull: true },
        { name: 'availability', type: DataTypes.DATEONLY, allowNull: true },
        { name: 'leaseTerm', type: DataTypes.STRING, allowNull: true },
        { name: 'furnishing', type: DataTypes.STRING, allowNull: true },
        { name: 'statusDate', type: DataTypes.DATEONLY, allowNull: true },
        { name: 'elevatorType', type: DataTypes.STRING, defaultValue: 'Thang máy' },
        { name: 'availableFloors', type: DataTypes.STRING, allowNull: true },
        { name: 'alleyType', type: DataTypes.STRING, defaultValue: 'Ô tô' },
        { name: 'hasWashingMachine', type: DataTypes.BOOLEAN, defaultValue: true },
        { name: 'hasDryer', type: DataTypes.BOOLEAN, defaultValue: false },
        { name: 'hasEvCharging', type: DataTypes.BOOLEAN, defaultValue: false },
        { name: 'allowPets', type: DataTypes.BOOLEAN, defaultValue: false },
        { name: 'maxOccupants', type: DataTypes.INTEGER, defaultValue: 2 },
        { name: 'maxVehicles', type: DataTypes.INTEGER, defaultValue: 2 },
        { name: 'allowForeigners', type: DataTypes.BOOLEAN, defaultValue: true },
        { name: 'isPublished', type: DataTypes.BOOLEAN, defaultValue: true },
      ];

      for (const col of requiredColumns) {
        if (!columns[col.name]) {
          try {
            await queryInterface.addColumn(actualTableName, col.name, {
              type: col.type,
              allowNull: col.allowNull !== undefined ? col.allowNull : true,
              defaultValue: col.defaultValue,
            });
            console.log(`✅ [AutoMigrate] Đã thêm cột ${col.name} vào bảng ${actualTableName}`);
          } catch (colErr) {
            console.warn(`⚠️ [AutoMigrate] Thêm cột ${col.name}:`, colErr.message);
          }
        }
      }
    }

    // 2. Kiểm tra bảng Leads
    if (tableNames.includes('Leads') || tableNames.includes('leads')) {
      const actualTableName = tableNames.includes('Leads') ? 'Leads' : 'leads';
      try {
        await sequelize.query(`ALTER TABLE \`${actualTableName}\` MODIFY COLUMN \`status\` VARCHAR(100) DEFAULT 'Đã hẹn xem'`);
        console.log('✅ [AutoMigrate] Đã cập nhật Leads.status thành VARCHAR(100)');
      } catch (err) {
        console.warn('⚠️ [AutoMigrate] Cập nhật Leads.status:', err.message);
      }
    }

    // 3. Kiểm tra bảng Deposits
    if (tableNames.includes('Deposits') || tableNames.includes('deposits')) {
      const actualTableName = tableNames.includes('Deposits') ? 'Deposits' : 'deposits';
      try {
        await sequelize.query(`ALTER TABLE \`${actualTableName}\` MODIFY COLUMN \`status\` VARCHAR(100) DEFAULT 'Đã nhận'`);
        console.log('✅ [AutoMigrate] Đã cập nhật Deposits.status thành VARCHAR(100)');
      } catch (err) {
        console.warn('⚠️ [AutoMigrate] Cập nhật Deposits.status:', err.message);
      }
    }

  } catch (error) {
    console.error('❌ [AutoMigrate Error]', error.message);
  }
}

module.exports = autoMigrate;
