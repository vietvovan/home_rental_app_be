const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

// Nạp biến môi trường
const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${env}` });
dotenv.config();

const { User, sequelize } = require('./models');

// ===================================================
// TÀI KHOẢN MẶC ĐỊNH CHO 3 ROLES
// Bạn có thể thay đổi email/password trước khi chạy
// ===================================================
const DEFAULT_ACCOUNTS = [
  {
    name: 'Admin NextHome',
    email: 'admin@nexthome.vn',
    password: 'Admin@123456',
    role: 'Admin',
    phone: '0901234567',
  },
  {
    name: 'Manager NextHome',
    email: 'manager@nexthome.vn',
    password: 'Manager@123456',
    role: 'Manager',
    phone: '0912345678',
  },
  {
    name: 'Agent NextHome',
    email: 'agent@nexthome.vn',
    password: 'Agent@123456',
    role: 'Agent',
    phone: '0923456789',
  },
];

async function seedUsers() {
  try {
    // Kết nối DB
    await sequelize.authenticate();
    console.log('✅ Kết nối MySQL thành công.');

    // Đồng bộ bảng (không xóa dữ liệu cũ)
    await sequelize.sync({ alter: true });
    console.log('✅ Đồng bộ bảng thành công.\n');

    let created = 0;
    let skipped = 0;

    for (const account of DEFAULT_ACCOUNTS) {
      // Kiểm tra tài khoản đã tồn tại chưa
      const existing = await User.findOne({ where: { email: account.email } });

      if (existing) {
        console.log(`⏭  [${account.role.padEnd(7)}] ${account.email} — đã tồn tại, bỏ qua.`);
        skipped++;
        continue;
      }

      // Hash mật khẩu
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(account.password, salt);

      // Tạo tài khoản
      await User.create({
        name: account.name,
        email: account.email,
        passwordHash,
        role: account.role,
        phone: account.phone,
        isActive: true,
      });

      console.log(`✅ [${account.role.padEnd(7)}] ${account.email} — tạo thành công.`);
      created++;
    }

    console.log('\n========================================');
    console.log(`📊 Kết quả: Tạo mới ${created} | Bỏ qua ${skipped}`);
    console.log('========================================\n');

    if (created > 0) {
      console.log('🔑 THÔNG TIN ĐĂNG NHẬP MẶC ĐỊNH:');
      console.log('----------------------------------------');
      DEFAULT_ACCOUNTS.forEach((acc) => {
        console.log(`  Role    : ${acc.role}`);
        console.log(`  Email   : ${acc.email}`);
        console.log(`  Password: ${acc.password}`);
        console.log('  ------');
      });
      console.log('\n⚠️  Hãy đổi mật khẩu sau khi đăng nhập lần đầu!\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi tạo tài khoản mặc định:', error.message);
    process.exit(1);
  }
}

seedUsers();
