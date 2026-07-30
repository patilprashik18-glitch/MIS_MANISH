import fs from 'fs';

async function testUploadAndVerify() {
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

    const buffer = fs.readFileSync('t:\\Manish MIS\\REPORT -01-07-26.xlsx');
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const formData = new FormData();
    formData.append('file', blob, 'REPORT -01-07-26.xlsx');

    console.log('Uploading REPORT -01-07-26.xlsx to /api/excel/upload...');
    const res = await fetch('http://localhost:5000/api/excel/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('❌ UPLOAD FAILED (Status ' + res.status + '):', data);
    } else {
      console.log('✅ UPLOAD SUCCESS!');
      const padtalReport = data.parsedData ? data.parsedData.padtal_data : null;
      if (padtalReport) {
        console.log('\n--- UPLOADED PADTAL REPORT SUMMARY ---');
        const summaryOnly = { ...padtalReport };
        delete summaryOnly.yield_detail;
        console.log(summaryOnly);
        console.log(`\nUploaded Products Count: ${padtalReport.yield_detail ? padtalReport.yield_detail.length : 0}`);
        if (padtalReport.yield_detail) {
          padtalReport.yield_detail.forEach((p, idx) => {
            console.log(`  ${idx + 1}. ${p.product_name} - Yield: ${p.yield_percent}%, RateBag: ${p.rate_per_bag}, RateKG: ${p.rate_per_kg}, AvgRate: ${p.avg_rate}`);
          });
        }
      } else {
        console.log('Keys in data.parsedData:', data.parsedData ? Object.keys(data.parsedData) : 'null');
      }
    }
  } catch (err) {
    console.error('❌ EXCEPTION:', err);
  }
}

testUploadAndVerify();
