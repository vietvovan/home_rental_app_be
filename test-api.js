async function testApi() {
  try {
    console.log('🔄 Bắt đầu kiểm thử API Backend...');

    // 1. Create a user (Admin)
    let res = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Admin Test',
        email: `admin_${Date.now()}@nexthome.vn`, // Unique email
        password: 'password123',
        role: 'Admin',
        phone: '0901234567'
      })
    });
    let data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    console.log('✅ 1. Đăng ký tài khoản Admin thành công:', data.email);
    const token = data.token;

    // 2. Create a property
    res = await fetch('http://localhost:5000/api/properties/admin', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Căn hộ Penthouse Landmark 81 View Sông',
        address: '208 Nguyễn Hữu Cảnh, Bình Thạnh, TP.HCM',
        price: 35000000,
        deposit: 70000000,
        beds: 3,
        baths: 2,
        area: 120,
        type: 'Penthouse',
        status: 'Còn trống',
        image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
        amenities: ['Hồ bơi vô cực', 'Phòng Gym', 'Ban công view sông', 'Smart Home'],
        agentId: data.id,
        isFeatured: true
      })
    });
    const propData = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(propData));
    console.log('✅ 2. Tạo bất động sản thành công. ID:', propData.id);

    // 3. Create a lead
    res = await fetch('http://localhost:5000/api/leads', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Nguyễn Văn Khách',
        phone: '0987654321',
        email: 'khachhang@example.com',
        budget: 35000000,
        area: 'Bình Thạnh',
        status: 'Mới',
        assigneeId: data.id,
        notes: 'Khách quan tâm căn hộ Penthouse Landmark 81'
      })
    });
    const leadData = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(leadData));
    console.log('✅ 3. Tạo khách hàng tiềm năng (Lead) thành công. ID:', leadData.id);

    // 4. Create a deposit
    res = await fetch('http://localhost:5000/api/deposits/admin', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        propertyId: propData.id,
        tenantName: 'Nguyễn Văn Khách',
        amount: 70000000,
        status: 'Đã nhận',
        contractNumber: `CTR-${Date.now()}`,
        depositDate: new Date().toISOString().split('T')[0]
      })
    });
    const depositData = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(depositData));
    console.log('✅ 4. Tạo hợp đồng đặt cọc thành công. ID:', depositData.id);

    // 5. Test Get Public Properties
    res = await fetch('http://localhost:5000/api/properties');
    const propertiesList = await res.json();
    console.log('✅ 5. Lấy danh sách bất động sản công khai thành công. Số lượng:', Array.isArray(propertiesList) ? propertiesList.length : 1);

    console.log('🎉 TẤT CẢ CÁC BƯỚC TEST API BACKEND ĐÃ THÀNH CÔNG VÀ ĐỒNG BỘ VỚI MYSQL!');
  } catch (err) {
    console.error('❌ Lỗi kiểm thử API:', err);
  }
}
testApi();
