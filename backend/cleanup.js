import fs from 'fs';
['test_dashboard.js', 'test_api_call.js'].forEach(f => {
  try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch(e){}
});
try { fs.unlinkSync('cleanup.js'); } catch(e){}
