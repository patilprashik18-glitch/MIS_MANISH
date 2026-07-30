import fs from 'fs';
import xlsx from 'xlsx';

const buffer = fs.readFileSync('t:\\Manish MIS\\REPORT -01-07-26.xlsx');
const workbook = xlsx.read(buffer, { type: 'buffer' });
const sheetName = workbook.SheetNames.find(n => n.toUpperCase().includes('PARTAL')) || workbook.SheetNames[1];
const sheet = workbook.Sheets[sheetName];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

for (let i = 12; i < Math.min(25, rows.length); i++) {
  console.log(`Row ${i}:`, rows[i]);
}
