async function testApi() {
  try {
    // 1. Create a user
    let res = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Admin',
        email: `admin_${Date.now()}@nexthome.vn`, // Ensure unique email
        password: 'password123',
        role: 'admin'
      })
    });
    let data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    console.log('User created:', data.email);
    const token = data.token;

    // 2. Create a property
    res = await fetch('http://localhost:5000/api/properties/admin', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Test Property',
        description: 'A test property',
        type: 'Nhà phố',
        price: 10000000,
        area: 100,
        location: 'Q1',
        address: '123 Main St',
        deposit: 5000000,
        beds: 3,
        baths: 2,
        status: 'Còn trống',
        images: JSON.stringify(['https://example.com/img.jpg']),
        amenities: JSON.stringify(['Wifi', 'Pool']),
      })
    });
    const propData = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(propData));
    console.log('Property created:', propData.id);

    // 3. Create a lead
    res = await fetch('http://localhost:5000/api/leads', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'John Doe',
        phone: '0909090909',
        email: 'john@example.com',
        budget: 10000000,
        area: 'Q1',
        status: 'Mới',
        propertyId: propData.id,
        assigneeId: data.id
      })
    });
    const leadData = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(leadData));
    console.log('Lead created:', leadData.id);

    // 4. Create a deposit
    res = await fetch('http://localhost:5000/api/deposits/admin', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        propertyId: propData.id,
        userId: data.id,
        amount: 5000000,
        status: 'Đã nhận',
        contractNumber: `CTR-${Date.now()}`,
        tenantName: 'John Doe',
        depositDate: new Date().toISOString(),
      })
    });
    const depositData = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(depositData));
    console.log('Deposit created:', depositData.id);

    console.log('API tests passed!');
  } catch (err) {
    console.error('API test failed:', err);
  }
}
testApi();
