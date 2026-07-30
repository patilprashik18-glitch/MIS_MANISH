import xlsx from 'xlsx';
import fs from 'fs';

const wb = xlsx.readFile('t:\\Manish MIS\\REPORT -01-07-26.xlsx');
let out = 'WORKBOOK SHEETS: ' + wb.SheetNames.join(', ') + '\n\n';

wb.SheetNames.forEach(name => {
  out += `\n====================================================\n`;
  out += `SHEET: "${name}"\n`;
  out += `====================================================\n`;
  const sheet = wb.Sheets[name];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const rowStr = r.map(c => String(c).trim()).join(' | ');
    if (
      rowStr.toUpperCase().includes('POWER') ||
      rowStr.toUpperCase().includes('UNIT CONSUMED') ||
      rowStr.toUpperCase().includes('ELECTRIC') ||
      rowStr.toUpperCase().includes('W.P') ||
      rowStr.toUpperCase().includes('ASH') ||
      rowStr.toUpperCase().includes('GLUTEN') ||
      rowStr.toUpperCase().includes('MOISTURE') ||
      rowStr.toUpperCase().includes('ATTENDANCE') ||
      rowStr.toUpperCase().includes('PRESENT') ||
      rowStr.toUpperCase().includes('ABSENT') ||
      rowStr.toUpperCase().includes('LAB REPORT') ||
      rowStr.toUpperCase().includes('MILL STAFF')
    ) {
      out += `\n--- MATCH at Row ${idx}: "${rowStr.slice(0, 70)}" ---\n`;
      for (let i = Math.max(0, idx - 1); i <= Math.min(rows.length - 1, idx + 15); i++) {
        const line = rows[i].slice(0, 15).map(c => String(c).trim());
        if (line.some(x => x !== '')) {
          out += `  [Row ${i}]: ${JSON.stringify(line)}\n`;
        }
      }
      idx += 15; // Skip ahead
    }
  }
});

fs.writeFileSync('t:\\Manish MIS\\backend\\sheet_inspection.txt', out);
console.log('Inspection written to sheet_inspection.txt. Summary of found sections:');
wb.SheetNames.forEach(name => {
  const sheet = wb.Sheets[name];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  rows.forEach((r, idx) => {
    const s = r.join(' ').toUpperCase();
    if (s.includes('POWER') || s.includes('UNIT CONSUMED')) console.log(`  [${name} - Row ${idx}]: Power / Unit Consumed`);
    if (s.includes('W.P') || s.includes('GLUTEN')) console.log(`  [${name} - Row ${idx}]: Lab Report (W.P/Gluten)`);
    if (s.includes('MOISTURE')) console.log(`  [${name} - Row ${idx}]: Moisture Report`);
    if (s.includes('PRESENT') || s.includes('MILL STAFF')) console.log(`  [${name} - Row ${idx}]: Attendance`);
  });
});
