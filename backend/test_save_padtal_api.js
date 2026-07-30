async function testSave() {
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@mfmpl.com',
        password: 'admin123'
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Login successful. Token acquired:', token ? 'YES' : 'NO');

    const payload = {
      report_date: '2026-07-01',
      parentData: {
        wheat_rate: 2700,
        wheat_net_avg_rate: 2710,
        difference_percent: 0.5,
        grinding_expense: 250,
        moisture_adjustment: 81,
        final_margin: 15
      },
      yield_detail: [
        { name: 'MAIDA PREMIUM 50 KG', yield_percent: 60, rate_per_bag: 1500, rate_per_kg: 30, avg_rate: 1800 }
      ],
      expenses: [
        { name: 'ELECTRIC BILL', amount: 100000 }
      ]
    };

    console.log('Sending POST /api/reports/padtal...');
    const res = await fetch('http://localhost:5000/api/reports/padtal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('❌ SAVE FAILED (Status ' + res.status + '):', data);
    } else {
      console.log('✅ SAVE SUCCESS:', data);
    }
  } catch (err) {
    console.error('❌ SAVE EXCEPTION:', err.message);
  }
}

testSave();
