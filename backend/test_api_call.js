import http from 'http';
import jwt from 'jsonwebtoken';

const token = jwt.sign({ id: 1, username: 'admin', role: 'admin' }, process.env.JWT_SECRET || 'supersecretkey123');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/dashboard/stats',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    if (res.statusCode === 200) {
      console.log('✅ /api/dashboard/stats returned 200 OK!');
      const data = JSON.parse(body);
      console.log('KPIs:', data.kpis);
      console.log('TrendData length:', data.trendData.length);
      console.log('RecentReports length:', data.recentReports.length);
    } else {
      console.log('❌ Error body:', body);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
});

req.end();
