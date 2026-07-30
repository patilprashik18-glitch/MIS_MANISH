import xlsx from 'xlsx';

const wb = xlsx.readFile('t:\\Manish MIS\\REPORT -01-07-26.xlsx');
const name = wb.SheetNames.find(n => n.toUpperCase().includes('PARTAL') || n.toUpperCase().includes('PADTAL'));
console.log('Sheet name:', name);
const sheet = wb.Sheets[name];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

rows.forEach((r, idx) => {
  if (r.some(c => String(c).trim() !== '')) {
    console.log(`Row ${idx}:`, r.map(c => String(c).trim()).filter(Boolean));
  }
});
