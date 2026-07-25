import http from 'http';

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/setup',
  method: 'POST'
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Response Status:', res.statusCode);
    console.log('Response Body:', data);
  });
});

req.on('error', error => {
  console.error('Error hitting setup endpoint:', error);
});

req.end();
