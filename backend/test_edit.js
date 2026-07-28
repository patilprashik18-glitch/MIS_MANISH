import http from 'http';

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, (res) => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(chunks) });
        } catch (e) {
          resolve({ status: res.statusCode, data: chunks });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function test() {
  try {
    console.log('1. Logging in as admin...');
    const loginRes = await request('POST', '/api/auth/login', { email: 'admin@mfmpl.com', password: 'admin123' });
    console.log('Login status:', loginRes.status, loginRes.data);
    if (loginRes.status !== 200) return;
    const token = loginRes.data.token;

    console.log('2. Checking recent reports...');
    const recents = await request('GET', '/api/dashboard/recent-reports', null, token);
    console.log('Recents status:', recents.status);
    if (!Array.isArray(recents.data) || recents.data.length === 0) {
      console.log('No recent reports found:', recents.data);
      return;
    }
    const targetDateStr = recents.data[0].report_date;
    const targetDate = targetDateStr.split('T')[0];
    console.log('Found recent report for date:', targetDate);

    console.log('3. Fetching report for date:', targetDate);
    const getRes = await request('GET', `/api/reports/daily/${targetDate}`, null, token);
    console.log('Get status:', getRes.status);
    if (getRes.status !== 200) {
      console.log('Get error:', getRes.data);
      return;
    }

    console.log('4. Attempting to update report for date:', targetDate);
    const postPayload = {
      report_date: targetDate,
      parentData: {
        mill_grinding: 100,
        chakki_grinding: 50,
        power_units: 300
      },
      finish_stock: [],
      sales_report: [],
      sales_pending: [],
      todays_production: [],
      salesman_sales: [],
      attendance: [],
      moisture: []
    };
    const postRes = await request('POST', '/api/reports/daily', postPayload, token);
    console.log('Post update status:', postRes.status);
    console.log('Post update response:', postRes.data);
  } catch (err) {
    console.error('Test error:', err.message);
  }
}

test();
