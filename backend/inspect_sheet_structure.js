import xlsx from 'xlsx';

const wb = xlsx.readFile('t:\\Manish MIS\\REPORT -01-07-26.xlsx');
console.log('ALL SHEETS:', wb.SheetNames);

wb.SheetNames.forEach(name => {
  console.log('=== SHEET:', name, '===');
  const sheet = wb.Sheets[name];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const rowStr = r.map(c => String(c).trim()).join(' | ');
    if (
      rowStr.toUpperCase().includes('POWER') ||
      rowStr.toUpperCase().includes('UNIT CONSUMED') ||
      rowStr.toUpperCase().includes('W.P') ||
      rowStr.toUpperCase().includes('ASH') ||
      rowStr.toUpperCase().includes('GLUTEN') ||
      rowStr.toUpperCase().includes('MOISTURE') ||
      rowStr.toUpperCase().includes('ATTENDANCE') ||
      rowStr.toUpperCase().includes('PRESENT') ||
      rowStr.toUpperCase().includes('ABSENT') ||
      rowStr.toUpperCase().includes('LAB REPORT')
    ) {
      console.log(`\n--- MATCH at Row ${idx}: "${rowStr.slice(0, 60)}" ---`);
      for (let i = Math.max(0, idx - 1); i <= Math.min(rows.length - 1, idx + 6); i++) {
        console.log(`Row ${i}:`, rows[i].slice(0, 15).map(c => String(c).trim()));
      }
      idx += 6; // skip ahead to avoid duplicate dumps
    }
  }
});
