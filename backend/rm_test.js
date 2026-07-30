import fs from 'fs';
['test_padtal_inspect.js'].forEach(f => {
  try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch(e){}
});
try { fs.unlinkSync('rm_test.js'); } catch(e){}
