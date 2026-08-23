const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

// Nạp biến môi trường
const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${env}` });
dotenv.config();

const { sequelize, User, Property, Lead, Deposit, BlogPost } = require('./models');

// ===================================================
// 1. DANH SÁCH 10 TÀI KHOẢN NGƯỜI DÙNG (USERS)
// ===================================================
const USERS_DATA = [
  { name: 'Admin NextHome', email: 'admin@nexthome.vn', password: 'Admin@123456', role: 'Admin', phone: '0978382207', address: '168 Phúc Minh, Phú Diễn, Hà Nội' },
  { name: 'Trần Thị Thảo (QL)', email: 'manager.thao@nexthome.vn', password: 'Manager@123456', role: 'Manager', phone: '0912345601', address: 'Số 12 Liễu Giai, Ba Đình, Hà Nội' },
  { name: 'Nguyễn Văn Hùng (QL)', email: 'manager.hung@nexthome.vn', password: 'Manager@123456', role: 'Manager', phone: '0912345602', address: '720A Điện Biên Phủ, Bình Thạnh, TP. HCM' },
  { name: 'Lê Hoàng Nam (MG)', email: 'agent.nam@nexthome.vn', password: 'Agent@123456', role: 'Agent', phone: '0923456701', address: '45 Trần Ngọc Diện, Thảo Điền, TP. Thủ Đức' },
  { name: 'Phạm Phương Linh (MG)', email: 'agent.linh@nexthome.vn', password: 'Agent@123456', role: 'Agent', phone: '0923456702', address: '159 Xa Lộ Hà Nội, TP. Thủ Đức' },
  { name: 'Nguyễn Minh Đức (MG)', email: 'agent.duc@nexthome.vn', password: 'Agent@123456', role: 'Agent', phone: '0923456703', address: '29 Liễu Giai, Ba Đình, Hà Nội' },
  { name: 'Trần Thu Mai (MG)', email: 'agent.mai@nexthome.vn', password: 'Agent@123456', role: 'Agent', phone: '0923456704', address: '187 Giảng Võ, Đống Đa, Hà Nội' },
  { name: 'Đỗ Anh Tuấn (MG)', email: 'agent.tuan@nexthome.vn', password: 'Agent@123456', role: 'Agent', phone: '0923456705', address: '18 Tràng Tiền, Hoàn Kiếm, Hà Nội' },
  { name: 'Vũ Thu Hương (MG)', email: 'agent.huong@nexthome.vn', password: 'Agent@123456', role: 'Agent', phone: '0923456706', address: 'Khu đô thị Ciputra, Tây Hồ, Hà Nội' },
  { name: 'Hoàng Quốc Bảo (MG)', email: 'agent.bao@nexthome.vn', password: 'Agent@123456', role: 'Agent', phone: '0923456707', address: '200 Ba Tháng Hai, Quận 10, TP. HCM' },
];

// ===================================================
// 2. DANH SÁCH 10 BẤT ĐỘNG SẢN (PROPERTIES)
// ===================================================
const PROPERTIES_DATA = [
  {
    title: 'Penthouse Landmark 81 View Sông Sài Gòn Panorama',
    address: '720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP. Hồ Chí Minh',
    price: 85000000,
    deposit: 170000000,
    commission: 42500000,
    beds: 4,
    baths: 4,
    area: 280,
    type: 'Penthouse',
    status: 'Còn trống',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop',
    amenities: ['Hồ bơi vô cực', 'Phòng gym', 'View sông', 'Smart home', 'Sân thượng', 'Bãi đỗ xe'],
    availability: '2026-09-01',
    leaseTerm: '12 tháng',
    furnishing: 'Nội thất cao cấp nhập khẩu',
    isFeatured: true,
  },
  {
    title: 'Căn Hộ Sang Trọng Vinhomes Metropolis Liễu Giai',
    address: '29 Liễu Giai, Phường Ngọc Khánh, Ba Đình, Hà Nội',
    price: 35000000,
    deposit: 70000000,
    commission: 17500000,
    beds: 2,
    baths: 2,
    area: 82,
    type: 'Chung cư',
    status: 'Còn trống',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop',
    amenities: ['Lễ tân 24/7', 'Phòng gym', 'Hồ bơi 4 mùa', 'TTTM ngầm', 'Trường học'],
    availability: '2026-08-25',
    leaseTerm: '12 tháng',
    furnishing: 'Nội thất đầy đủ',
    isFeatured: true,
  },
  {
    title: 'Biệt Thự Vườn Thảo Điền Phong Cách Tropical Resort',
    address: '45 Trần Ngọc Diện, Thảo Điền, Thành phố Thủ Đức, TP. Hồ Chí Minh',
    price: 110000000,
    deposit: 220000000,
    commission: 55000000,
    beds: 5,
    baths: 5,
    area: 420,
    type: 'Biệt thự',
    status: 'Đang thương lượng',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
    amenities: ['Hồ bơi riêng', 'Sân vườn', 'Khu BBQ', 'Gara 2 ô tô', 'Phòng xông hơi'],
    availability: '2026-09-15',
    leaseTerm: '24 tháng',
    furnishing: 'Nội thất đầy đủ',
    isFeatured: true,
  },
  {
    title: 'Studio Duplex Masteri Thảo Điền View Thành Phố',
    address: '159 Xa Lộ Hà Nội, Thảo Điền, Thành phố Thủ Đức, TP. Hồ Chí Minh',
    price: 18000000,
    deposit: 36000000,
    commission: 9000000,
    beds: 1,
    baths: 1,
    area: 48,
    type: 'Studio',
    status: 'Còn trống',
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
    amenities: ['Bể bơi', 'Gym', 'Gần tuyến Metro', 'Vincom Mega Mall'],
    availability: '2026-08-28',
    leaseTerm: '6 - 12 tháng',
    furnishing: 'Nội thất hiện đại',
    isFeatured: false,
  },
  {
    title: 'Sky Villa Ciputra Tây Hồ Đẳng Cấp Thượng Lưu',
    address: 'Khu đô thị Nam Thăng Long, Phú Thượng, Tây Hồ, Hà Nội',
    price: 75000000,
    deposit: 150000000,
    commission: 37500000,
    beds: 4,
    baths: 3,
    area: 230,
    type: 'Penthouse',
    status: 'Đã cho thuê',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop',
    amenities: ['Sân golf mini', 'Trường quốc tế UNIS', 'Bể bơi', 'Công viên xanh'],
    availability: '2026-10-01',
    leaseTerm: '12 tháng',
    furnishing: 'Nội thất tân cổ điển',
    isFeatured: true,
  },
  {
    title: 'Căn Hộ View Trực Diện Sông The River Thủ Thiêm',
    address: 'Đại lộ Vòng Cung, Thủ Thiêm, Thành phố Thủ Đức, TP. Hồ Chí Minh',
    price: 52000000,
    deposit: 104000000,
    commission: 26000000,
    beds: 3,
    baths: 2,
    area: 125,
    type: 'Chung cư',
    status: 'Còn trống',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop',
    amenities: ['Hồ bơi chuẩn Olympic', 'Phòng Cigar & Wine', 'Rạp chiếu phim', 'Bến du thuyền'],
    availability: '2026-09-01',
    leaseTerm: '12 tháng',
    furnishing: 'Nội thất nguyên bản CĐT',
    isFeatured: true,
  },
  {
    title: 'Nhà Phố Kiến Trúc Pháp Hoàn Kiếm Kinh Doanh Đỉnh',
    address: '18 Tràng Tiền, Phường Tràng Tiền, Hoàn Kiếm, Hà Nội',
    price: 90000000,
    deposit: 270000000,
    commission: 45000000,
    beds: 4,
    baths: 4,
    area: 160,
    type: 'Nhà phố',
    status: 'Còn trống',
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&h=600&fit=crop',
    amenities: ['Mặt tiền lớn', 'Vị trí đắc địa', 'Thích hợp Showroom/Coffee', 'Phố đi bộ'],
    availability: '2026-09-10',
    leaseTerm: '36 tháng',
    furnishing: 'Cơ bản',
    isFeatured: false,
  },
  {
    title: 'Loft Hiện Đại Phong Cách Industrial Giảng Võ',
    address: '187 Giảng Võ, Phường Cát Linh, Đống Đa, Hà Nội',
    price: 26000000,
    deposit: 52000000,
    commission: 13000000,
    beds: 2,
    baths: 2,
    area: 95,
    type: 'Loft',
    status: 'Còn trống',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
    amenities: ['Trần cao 5m', 'Cửa sổ kính Low-E', 'Tường gạch thô vintage', 'Smart Key'],
    availability: '2026-08-30',
    leaseTerm: '12 tháng',
    furnishing: 'Nội thất thiết kế',
    isFeatured: false,
  },
  {
    title: 'Căn Hộ 2PN Hado Centrosa Garden Trung Tâm Quận 10',
    address: '200 Ba Tháng Hai, Phường 12, Quận 10, TP. Hồ Chí Minh',
    price: 24000000,
    deposit: 48000000,
    commission: 12000000,
    beds: 2,
    baths: 2,
    area: 86,
    type: 'Chung cư',
    status: 'Đã cho thuê',
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop',
    amenities: ['21 khu vườn chân mây', 'Bể bơi tràn bờ', 'Phòng Gym cao cấp', 'An ninh 24/7'],
    availability: '2026-09-01',
    leaseTerm: '12 tháng',
    furnishing: 'Nội thất đầy đủ',
    isFeatured: false,
  },
  {
    title: 'Biệt Thự Nghỉ Dưỡng Ocean Villas Sơn Trà View Biển',
    address: 'Võ Nguyên Giáp, Phường Khuê Mỹ, Ngũ Hành Sơn, Đà Nẵng',
    price: 68000000,
    deposit: 136000000,
    commission: 34000000,
    beds: 4,
    baths: 4,
    area: 350,
    type: 'Biệt thự',
    status: 'Còn trống',
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&h=600&fit=crop',
    amenities: ['Mặt biển', 'Bể bơi riêng', 'Sân vườn nhiệt đới', 'Dịch vụ chuẩn 5 sao'],
    availability: '2026-09-05',
    leaseTerm: '12 tháng',
    furnishing: 'Nội thất cao cấp chuẩn resort',
    isFeatured: true,
  },
];

// ===================================================
// 3. DANH SÁCH 10 KHÁCH HÀNG TIỀM NĂNG (LEADS)
// ===================================================
const LEADS_DATA = [
  {
    name: 'Phạm Thu Hà',
    email: 'thuha.pham@gmail.com',
    phone: '0912345678',
    budget: 35000000,
    area: 'Quận Ba Đình, Hà Nội',
    moveInDate: '2026-09-01',
    status: 'Đã hẹn xem',
    notes: JSON.stringify([
      { date: '20/08/2026', author: 'Lê Hoàng Nam', role: 'Agent', text: 'Khách quan tâm căn 2PN Vinhomes Metropolis, hẹn xem nhà vào 09:00 sáng Thứ Bảy.' }
    ]),
  },
  {
    name: 'Lê Hoàng Nam',
    email: 'nam.le@vietcorp.vn',
    phone: '0934567890',
    budget: 85000000,
    area: 'Quận Bình Thạnh, TP. Hồ Chí Minh',
    moveInDate: '2026-08-25',
    status: 'Đã đóng',
    notes: JSON.stringify([
      { date: '18/08/2026', author: 'Phạm Phương Linh', role: 'Agent', text: 'Đã chốt cọc Penthouse Landmark 81 thành công. Hợp đồng 12 tháng.' }
    ]),
  },
  {
    name: 'Nguyễn Minh Đức',
    email: 'duc.minh@techfin.io',
    phone: '0987654321',
    budget: 52000000,
    area: 'Thành phố Thủ Đức, TP. Hồ Chí Minh',
    moveInDate: '2026-09-10',
    status: 'Đã hẹn xem',
    notes: JSON.stringify([
      { date: '21/08/2026', author: 'Nguyễn Minh Đức', role: 'Agent', text: 'Khách thích căn The River Thủ Thiêm view sông, yêu cầu tầng cao.' }
    ]),
  },
  {
    name: 'Trần Thị Mai',
    email: 'mai.tran@fashion.vn',
    phone: '0902345678',
    budget: 26000000,
    area: 'Quận Đống Đa, Hà Nội',
    moveInDate: '2026-08-30',
    status: 'Đã hẹn xem',
    notes: JSON.stringify([
      { date: '19/08/2026', author: 'Trần Thu Mai', role: 'Agent', text: 'Cần căn hộ dạng Loft có ánh sáng tốt để làm studio cá nhân.' }
    ]),
  },
  {
    name: 'Đặng Bảo Châu',
    email: 'chau.dang@consulting.org',
    phone: '0978901234',
    budget: 68000000,
    area: 'Ngũ Hành Sơn, Đà Nẵng',
    moveInDate: '2026-09-15',
    status: 'Thất bại',
    notes: JSON.stringify([
      { date: '15/08/2026', author: 'Đỗ Anh Tuấn', role: 'Agent', text: 'Khách thay đổi kế hoạch chuyển công tác về Sài Gòn nên dừng tìm thuê.' }
    ]),
  },
  {
    name: 'Võ Văn Khoa',
    email: 'khoa.vo@logistics.com',
    phone: '0967890123',
    budget: 110000000,
    area: 'Thành phố Thủ Đức, TP. Hồ Chí Minh',
    moveInDate: '2026-09-20',
    status: 'Đã hẹn xem',
    notes: JSON.stringify([
      { date: '22/08/2026', author: 'Vũ Thu Hương', role: 'Agent', text: 'Khách tìm Biệt thự Thảo Điền cho chuyên gia nước ngoài ở, yêu cầu hồ bơi lớn.' }
    ]),
  },
  {
    name: 'Bùi Quỳnh Nga',
    email: 'nga.bui@architecture.vn',
    phone: '0945678901',
    budget: 24000000,
    area: 'Quận 10, TP. Hồ Chí Minh',
    moveInDate: '2026-08-20',
    status: 'Đã đóng',
    notes: JSON.stringify([
      { date: '12/08/2026', author: 'Hoàng Quốc Bảo', role: 'Agent', text: 'Đã ký hợp đồng và nhận cọc căn hộ Hado Centrosa Garden.' }
    ]),
  },
  {
    name: 'Hoàng Anh Tuấn',
    email: 'tuan.hoang@investcap.com',
    phone: '0918765432',
    budget: 75000000,
    area: 'Quận Tây Hồ, Hà Nội',
    moveInDate: '2026-10-01',
    status: 'Đã đóng',
    notes: JSON.stringify([
      { date: '14/08/2026', author: 'Lê Hoàng Nam', role: 'Agent', text: 'Đã đặt cọc giữ chỗ căn Sky Villa Ciputra. Chuẩn bị ký HĐ chính thức.' }
    ]),
  },
  {
    name: 'Vũ Phương Thảo',
    email: 'thao.vu@media.vn',
    phone: '0923456781',
    budget: 18000000,
    area: 'Thành phố Thủ Đức, TP. Hồ Chí Minh',
    moveInDate: '2026-08-28',
    status: 'Đã hẹn xem',
    notes: JSON.stringify([
      { date: '21/08/2026', author: 'Phạm Phương Linh', role: 'Agent', text: 'Khách xem Studio Masteri Thảo Điền tối nay lúc 18:30.' }
    ]),
  },
  {
    name: 'Trịnh Công Minh',
    email: 'minh.trinh@shipping.vn',
    phone: '0938123456',
    budget: 90000000,
    area: 'Quận Hoàn Kiếm, Hà Nội',
    moveInDate: '2026-09-10',
    status: 'Đã hẹn xem',
    notes: JSON.stringify([
      { date: '22/08/2026', author: 'Đỗ Anh Tuấn', role: 'Agent', text: 'Khách tìm nhà phố Tràng Tiền để mở chuỗi cafe cao cấp, hẹn gặp chủ nhà.' }
    ]),
  },
];

// ===================================================
// 4. DANH SÁCH 10 HỢP ĐỒNG ĐẶT CỌC (DEPOSITS)
// ===================================================
const DEPOSITS_DATA = [
  { contractNumber: 'HD-2026-001', tenantName: 'Lê Hoàng Nam', amount: 170000000, status: 'Đã nhận', depositDate: '2026-08-01' },
  { contractNumber: 'HD-2026-002', tenantName: 'Bùi Quỳnh Nga', amount: 48000000, status: 'Đã nhận', depositDate: '2026-08-05' },
  { contractNumber: 'HD-2026-003', tenantName: 'Hoàng Anh Tuấn', amount: 150000000, status: 'Đã nhận', depositDate: '2026-08-10' },
  { contractNumber: 'HD-2026-004', tenantName: 'Nguyễn Văn Thịnh', amount: 70000000, status: 'Đã hoàn trả', depositDate: '2026-07-15' },
  { contractNumber: 'HD-2026-005', tenantName: 'Trần Thùy Linh', amount: 104000000, status: 'Đã nhận', depositDate: '2026-08-12' },
  { contractNumber: 'HD-2026-006', tenantName: 'Đỗ Quốc Huy', amount: 220000000, status: 'Đã nhận', depositDate: '2026-08-14' },
  { contractNumber: 'HD-2026-007', tenantName: 'Lưu Ngọc Mai', amount: 52000000, status: 'Đã nhận', depositDate: '2026-08-16' },
  { contractNumber: 'HD-2026-008', tenantName: 'Phạm Gia Bảo', amount: 36000000, status: 'Bị giữ cọc', depositDate: '2026-07-20' },
  { contractNumber: 'HD-2026-009', tenantName: 'Vương Quốc Cường', amount: 90000000, status: 'Đã nhận', depositDate: '2026-08-18' },
  { contractNumber: 'HD-2026-010', tenantName: 'Ngô Hải Yến', amount: 136000000, status: 'Đã nhận', depositDate: '2026-08-20' },
];

// ===================================================
// 5. DANH SÁCH 10 BÀI VIẾT BLOG (BLOGPOSTS)
// ===================================================
const BLOGS_DATA = [
  {
    title: 'Xu Hướng Thuê Bất Động Sản Hạng Sang 2026: Trải Nghiệm Chuẩn Wellness',
    excerpt: 'Cùng NextHome khám phá sự chuyển dịch trong hành vi thuê nhà của giới chuyên gia và doanh nhân với tiêu chuẩn sống xanh, smart home và tiện ích nghỉ dưỡng tại gia.',
    content: '<p>Năm 2026 đánh dấu bước chuyển mình mạnh mẽ của thị trường bất động sản cho thuê cao cấp tại các đô thị lớn như Hà Nội và TP. Hồ Chí Minh. Không chỉ đơn thuần là tìm kiếm một không gian sống, khách thuê hiện nay đặc biệt chú trọng vào yếu tố sức khỏe (Wellness) và tích hợp công nghệ thông minh.</p><h3>1. Thiết kế ưu tiên ánh sáng tự nhiên và cây xanh</h3><p>Các căn hộ sở hữu ban công panorama, logia rộng thoáng cùng hệ thống lọc không khí, nước uống tại vòi chuẩn quốc tế đang là lựa chọn hàng đầu của phân khúc chuyên gia nước ngoài và gia đình trẻ thành đạt.</p><h3>2. Tiện ích all-in-one nâng tầm trải nghiệm</h3><p>Hồ bơi nước ấm vô cực, phòng gym chuyên nghiệp, khu co-working space và dịch vụ quản lý vận hành 5 sao mang đến cuộc sống tiện nghi trọn vẹn.</p>',
    category: 'Thị Trường',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=500&fit=crop',
    readTime: '4 phút',
    isFeatured: true,
    publishedAt: '2026-08-20',
  },
  {
    title: 'Kinh Nghiệm Kiểm Tra Hợp Đồng Thuê Nhà Đảm Bảo Quyền Lợi Pháp Lý',
    excerpt: 'Những điều khoản pháp lý quan trọng về tiền cọc, bàn giao nội thất, chi phí dịch vụ và điều kiện hoàn trả cọc mà người thuê nhà nhất định phải nắm rõ.',
    content: '<p>Hợp đồng thuê nhà là văn bản pháp lý quan trọng nhất bảo vệ quyền lợi của cả bên thuê và bên cho thuê. Dưới đây là 5 điểm then chốt cần rà soát kỹ trước khi ký hợp đồng.</p><ul><li>Kiểm tra tính pháp lý của chủ nhà hoặc người được ủy quyền hợp pháp.</li><li>Quy định rõ ràng về số tiền cọc, thời hạn thanh toán và điều kiện hoàn cọc.</li><li>Biên bản bàn giao hiện trạng trang thiết bị nội thất chi tiết kèm hình ảnh.</li><li>Thỏa thuận chi phí điện, nước, internet và phí quản lý tòa nhà.</li><li>Điều khoản chấm dứt hợp đồng trước hạn và thời gian báo trước tối thiểu.</li></ul>',
    category: 'Pháp Lý & Kinh Nghiệm',
    image: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&h=500&fit=crop',
    readTime: '6 phút',
    isFeatured: true,
    publishedAt: '2026-08-18',
  },
  {
    title: 'Top 5 Khu Vực Cho Thuê Căn Hộ Đáng Sống Nhất Tại Hà Nội',
    excerpt: 'Đánh giá chi tiết môi trường sống, hạ tầng giao thông và tiện ích xung quanh tại các quận Ba Đình, Tây Hồ, Cầu Giấy, Nam Từ Liêm và Hoàn Kiếm.',
    content: '<p>Hà Nội có nhiều khu vực sôi động phục vụ nhu cầu thuê nhà đa dạng từ căn hộ trung tâm đến biệt thự ven hồ thơ mộng. Dưới đây là top 5 khu vực được đánh giá cao nhất về chất lượng sống năm 2026.</p>',
    category: 'Khu Vực',
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=500&fit=crop',
    readTime: '5 phút',
    isFeatured: false,
    publishedAt: '2026-08-15',
  },
  {
    title: 'Gợi Ý Thiết Kế Nội Thất Tối Giản (Minimalism) Cho Căn Hộ Studio',
    excerpt: 'Tối ưu hóa không gian sống nhỏ hẹp với phong cách tối giản hiện đại, sử dụng nội thất đa năng và gam màu trung tính tinh tế.',
    content: '<p>Phong cách Minimalism là chìa khóa mở rộng không gian cho các căn hộ studio diện tích từ 35m² đến 50m², giúp không gian vừa ngăn nắp vừa toát lên vẻ sang trọng.</p>',
    category: 'Thiết Kế & Không Gian',
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&h=500&fit=crop',
    readTime: '3 phút',
    isFeatured: false,
    publishedAt: '2026-08-12',
  },
  {
    title: 'Bí Quyết Chọn Căn Hộ Chung Cư Đón Gió Và Hợp Phong Thủy',
    excerpt: 'Hướng dẫn xem hướng nhà, ban công đón gió nam mát mẻ, tránh nắng tây gay gắt và cách bài trí không gian thu hút tài lộc cho gia chủ.',
    content: '<p>Phong thủy căn hộ chung cư ảnh hưởng trực tiếp đến sức khỏe và sự thoải mái của các thành viên trong gia đình. Cùng tìm hiểu cách chọn hướng và bài trí chuẩn phong thủy.</p>',
    category: 'Phong Thủy',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=500&fit=crop',
    readTime: '5 phút',
    isFeatured: false,
    publishedAt: '2026-08-10',
  },
  {
    title: 'So Sánh Thuê Căn Hộ Dịch Vụ (Serviced Apartment) Và Chung Cư Cao Cấp',
    excerpt: 'Phân tích ưu nhược điểm, chi phí trọn gói và mức độ phù hợp của từng loại hình dành cho người đi làm, chuyên gia nước ngoài và gia đình.',
    content: '<p>Căn hộ dịch vụ và chung cư cao cấp đều là những lựa chọn phổ biến, nhưng loại hình nào phù hợp hơn với nhu cầu lưu trú thực tế của bạn?</p>',
    category: 'Tư Vấn Thuê',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=500&fit=crop',
    readTime: '4 phút',
    isFeatured: false,
    publishedAt: '2026-08-08',
  },
  {
    title: 'Cẩm Nang Chuyển Nhà Nhanh Chóng, An Toàn Và Tiết Kiệm Chi Phí',
    excerpt: 'Checklist các bước đóng gói đồ đạc, lựa chọn dịch vụ vận chuyển uy tín và những lưu ý khi bàn giao nhà cũ, nhận nhà mới.',
    content: '<p>Chuyển nhà không còn là nỗi ám ảnh nếu bạn có một kế hoạch khoa học từ khâu phân loại đồ đạc, đóng gói đồ dễ vỡ cho đến thời điểm di chuyển thuận lợi.</p>',
    category: 'Mẹo Sống',
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=500&fit=crop',
    readTime: '4 phút',
    isFeatured: false,
    publishedAt: '2026-08-05',
  },
  {
    title: 'Không Gian Sống Thông Minh (Smart Home) – Xu Hướng Không Thể Thiếu',
    excerpt: 'Hệ thống điều khiển ánh sáng, điều hòa, khóa cửa thông minh qua giọng nói và smartphone đang nâng tầm chất lượng sống của cư dân hiện đại.',
    content: '<p>Smart Home không chỉ mang lại sự tiện ích mà còn giúp tối ưu hóa năng lượng tiêu thụ và nâng cao an ninh cho ngôi nhà của bạn.</p>',
    category: 'Công Nghệ',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=500&fit=crop',
    readTime: '5 phút',
    isFeatured: false,
    publishedAt: '2026-08-02',
  },
  {
    title: 'Cách Đàm Phán Giá Thuê Nhà Hiệu Quả Với Chủ Nhà Hoặc Môi Giới',
    excerpt: 'Những kỹ năng thương lượng thực tế dựa trên thời hạn hợp đồng, phương thức thanh toán và thời điểm ký kết hợp đồng thuê.',
    content: '<p>Làm thế nào để đàm phán được mức giá thuê tốt nhất kèm theo các ưu đãi miễn phí dịch vụ hoặc giảm tiền cọc? Dưới đây là những kinh nghiệm đắt giá.</p>',
    category: 'Tư Vấn Thuê',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=500&fit=crop',
    readTime: '4 phút',
    isFeatured: false,
    publishedAt: '2026-07-28',
  },
  {
    title: 'Quy Trình Quản Lý Và Bảo Trì Bất Động Sản Cho Thuê Chuyên Nghiệp',
    excerpt: 'Bí quyết giúp chủ nhà duy trì giá trị tài sản, giữ chân khách thuê dài hạn và tối ưu hóa dòng tiền thụ động ổn định hàng tháng.',
    content: '<p>Quản lý bất động sản cho thuê đòi hỏi quy trình bảo trì định kỳ hệ thống điện nước, thiết bị gia dụng và chăm sóc khách thuê chu đáo, chuyên nghiệp.</p>',
    category: 'Dành Cho Chủ Nhà',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=500&fit=crop',
    readTime: '6 phút',
    isFeatured: true,
    publishedAt: '2026-07-25',
  },
];

async function seedAllTables() {
  try {
    console.log('🚀 Bắt đầu quá trình đồng bộ và Import 10 rows cho mỗi bảng Database...\n');

    // 1. Kết nối Database
    await sequelize.authenticate();
    console.log('✅ 1. Kết nối MySQL Database thành công.');

    // 2. Đồng bộ cấu trúc bảng
    await sequelize.sync({ alter: true });
    console.log('✅ 2. Đồng bộ bảng hoàn tất.\n');

    // 3. Xóa dữ liệu cũ theo thứ tự quan hệ (Foreign Key)
    console.log('🧹 3. Dọn dẹp dữ liệu cũ...');
    await Deposit.destroy({ where: {}, truncate: { cascade: true } }).catch(() => Deposit.destroy({ where: {} }));
    await Lead.destroy({ where: {}, truncate: { cascade: true } }).catch(() => Lead.destroy({ where: {} }));
    await BlogPost.destroy({ where: {}, truncate: { cascade: true } }).catch(() => BlogPost.destroy({ where: {} }));
    await Property.destroy({ where: {}, truncate: { cascade: true } }).catch(() => Property.destroy({ where: {} }));
    await User.destroy({ where: {}, truncate: { cascade: true } }).catch(() => User.destroy({ where: {} }));
    console.log('✅ Đã làm sạch các bảng.\n');

    // 4. Import Bảng Users (10 rows)
    console.log('👤 4. Đang Import 10 Users...');
    const createdUsers = [];
    const salt = await bcrypt.genSalt(10);

    for (const u of USERS_DATA) {
      const passwordHash = await bcrypt.hash(u.password, salt);
      const user = await User.create({
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
        phone: u.phone,
        address: u.address,
        isActive: true,
      });
      createdUsers.push(user);
    }
    console.log(`✅ Đã Import thành công ${createdUsers.length} Users.\n`);

    // 5. Import Bảng Properties (10 rows)
    console.log('🏡 5. Đang Import 10 Properties...');
    const createdProperties = [];
    for (let i = 0; i < PROPERTIES_DATA.length; i++) {
      const p = PROPERTIES_DATA[i];
      const assignedAgent = createdUsers[3 + (i % 7)]; // Gán cho các Agent (index 3 đến 9)
      const prop = await Property.create({
        ...p,
        agentId: assignedAgent.id,
      });
      createdProperties.push(prop);
    }
    console.log(`✅ Đã Import thành công ${createdProperties.length} Properties.\n`);

    // 6. Import Bảng Leads (10 rows)
    console.log('🎯 6. Đang Import 10 Leads...');
    const createdLeads = [];
    for (let i = 0; i < LEADS_DATA.length; i++) {
      const l = LEADS_DATA[i];
      const assignedAgent = createdUsers[3 + (i % 7)];
      const lead = await Lead.create({
        ...l,
        assigneeId: assignedAgent.id,
      });
      createdLeads.push(lead);
    }
    console.log(`✅ Đã Import thành công ${createdLeads.length} Leads.\n`);

    // 7. Import Bảng Deposits (10 rows)
    console.log('💰 7. Đang Import 10 Deposits...');
    const createdDeposits = [];
    for (let i = 0; i < DEPOSITS_DATA.length; i++) {
      const d = DEPOSITS_DATA[i];
      const prop = createdProperties[i % createdProperties.length];
      const dep = await Deposit.create({
        ...d,
        propertyId: prop.id,
      });
      createdDeposits.push(dep);
    }
    console.log(`✅ Đã Import thành công ${createdDeposits.length} Deposits.\n`);

    // 8. Import Bảng BlogPosts (10 rows)
    console.log('📰 8. Đang Import 10 BlogPosts...');
    const createdBlogs = [];
    for (let i = 0; i < BLOGS_DATA.length; i++) {
      const b = BLOGS_DATA[i];
      const author = createdUsers[i % 3]; // Admin hoặc Manager viết bài
      const blog = await BlogPost.create({
        ...b,
        authorId: author.id,
      });
      createdBlogs.push(blog);
    }
    console.log(`✅ Đã Import thành công ${createdBlogs.length} BlogPosts.\n`);

    console.log('=====================================================');
    console.log('🎉 TẤT CẢ 5 BẢNG ĐÃ ĐƯỢC IMPORT 10 ROWS THÀNH CÔNG!');
    console.log('=====================================================');
    console.log(`1. Users       : ${createdUsers.length} rows`);
    console.log(`2. Properties  : ${createdProperties.length} rows`);
    console.log(`3. Leads       : ${createdLeads.length} rows`);
    console.log(`4. Deposits    : ${createdDeposits.length} rows`);
    console.log(`5. BlogPosts   : ${createdBlogs.length} rows`);
    console.log('=====================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi trong quá trình Import dữ liệu:', error);
    process.exit(1);
  }
}

seedAllTables();
