import xlsx from 'xlsx';

const wb = xlsx.readFile('t:\\Manish MIS\\REPORT -01-07-26.xlsx');
console.log('====================================');
console.log('ALL SHEETS IN WORKBOOK:', wb.SheetNames);
console.log('====================================\n');

wb.SheetNames.forEach(name => {
  console.log(`\n========================================`);
  console.log(`SHEET: "${name}"`);
  console.log(`========================================`);
  const sheet = wb.Sheets[name];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  console.log(`Total Rows: ${rows.length}`);
  console.log('--- First 12 Rows of Sheet ---');
  for (let i = 0; i < Math.min(12, rows.length); i++) {
    const nonBlank = rows[i].map(c => String(c).trim()).filter(x => x !== '');
    if (nonBlank.length > 0) {
      console.log(`Row ${i}:`, nonBlank.slice(0, 10));
    }
  }

  // Scan for keywords
  const keywords = ['POWER', 'ELECTRIC', 'UNIT', 'METER', 'READING', 'LAB', 'W.P', 'ASH', 'GLUTEN', 'MOIST', 'ATTEND', 'PRESENT', 'ABSENT', 'STAFF', 'WORKER', 'GRIND', 'WHEAT'];
  console.log('--- Keyword Matches ---');
  let matchCount = 0;
  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const rowStr = r.map(c => String(c).trim()).join(' | ').toUpperCase();
    if (keywords.some(k => rowStr.includes(k))) {
      matchCount++;
      if (matchCount <= 8) { // print first 8 matches per sheet
        console.log(`[Match Row ${idx}]:`, r.slice(0, 12).map(c => String(c).trim()).filter(x => x !== ''));
      }
    }
  }
  if (matchCount > 8) {
    console.log(`... and ${matchCount - 8} more keyword matches in "${name}"`);
  }
});
