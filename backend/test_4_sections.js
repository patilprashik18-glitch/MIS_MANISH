import fs from 'fs';
import xlsx from 'xlsx';

const buffer = fs.readFileSync('t:\\Manish MIS\\REPORT -01-07-26.xlsx');
const workbook = xlsx.read(buffer, { type: 'buffer' });
const sheet = workbook.Sheets['REPORT DATA SHEET'];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

const findRow = (...keywords) => rows.findIndex(r => r && r.some(c => {
  const str = String(c).toUpperCase().replace(/\s+/g, ' ').trim();
  return keywords.some(k => str.includes(k.toUpperCase().replace(/\s+/g, ' ').trim()));
}));
const getVal = (r, c) => (rows[r] && rows[r][c]) ? rows[r][c] : 0;
const getStr = (r, c) => (rows[r] && rows[r][c]) ? String(rows[r][c]).trim() : '';
const pick = (r, ...cols) => {
  for (const c of cols) {
    if (rows[r] && rows[r][c] !== undefined && rows[r][c] !== '') return rows[r][c];
  }
  return 0;
};

// 1. Power Units
const powerRow = findRow('UNIT CONSUMED', 'UNIT PER QTL', 'ELE COST PER BAG');
const power_units = powerRow !== -1 ? Number(pick(powerRow, 1, 2)) : 0;
const power_rate_per_unit = powerRow !== -1 ? Number(getVal(powerRow+3, 1)) || 0 : 0;

// 2. Lab Report
const lab_report = { wp: 0, ash: 0, gluten: 0, sedimentation: 0, bread_height: 0 };
const labRow = findRow('W.P');
if(labRow !== -1) {
  lab_report.wp = parseFloat(pick(labRow, 6, 5)) || 0;
  lab_report.ash = parseFloat(pick(labRow, 9, 8)) || 0;
  let gl = parseFloat(pick(labRow+1, 6, 5)) || 0;
  if (gl > 0 && gl < 1) gl = Number((gl * 100).toFixed(2));
  lab_report.gluten = gl;
  lab_report.sedimentation = parseFloat(pick(labRow+1, 9, 8)) || 0;
  lab_report.bread_height = parseFloat(pick(labRow+2, 6, 5)) || 0;
}

// 3. Attendance
const attendance = [];
const attStartIdx = rows.findIndex(r => r && (
  String(r[0] || '').trim().toUpperCase() === 'ADMIN' ||
  String(r[0] || '').trim().toUpperCase() === 'MILL STAFF' ||
  (String(r[0] || '').trim().toUpperCase() === 'ATTENDANCE' && r.some(c => String(c).toUpperCase().includes('PRESENT')))
));
if (attStartIdx !== -1) {
  const startRow = String(rows[attStartIdx][0] || '').trim().toUpperCase() === 'ATTENDANCE' ? attStartIdx + 1 : attStartIdx;
  for (let i = startRow; i < startRow + 10; i++) {
    const dept = getStr(i, 0);
    if (!dept || dept.toUpperCase().includes('TOTAL') || dept.toUpperCase().includes('ATTENDANCE')) {
      if (dept.toUpperCase().includes('TOTAL') && i > startRow) break;
      continue;
    }
    const present = Number(getVal(i, 3)) || Number(getVal(i, 2)) || 0;
    const absent = Number(getVal(i, 4)) || 0;
    const total = Number(getVal(i, 1)) || (present + absent);
    attendance.push({
      department: dept,
      total: total,
      present: present,
      absent: absent
    });
  }
}

// 4. Moisture Report
const moisture_report = [];
const moistStartIdx = findRow('MOISTURE', 'WHEAT MOISTURE') !== -1 ? findRow('MOISTURE', 'WHEAT MOISTURE') + 1 : -1;
if (moistStartIdx !== -1) {
  for (let i = moistStartIdx; i < moistStartIdx + 12; i++) {
    const item = getStr(i, 0);
    if (!item || item.toUpperCase().includes('TOTAL') || item.toUpperCase().includes('WHEAT MOISTURE') || item.toUpperCase().includes('DIFFERENCE')) {
      if (item.toUpperCase().includes('TOTAL') && i > moistStartIdx) break;
      continue;
    }
    let m1 = Number(getVal(i, 1)) || 0;
    let m2 = Number(getVal(i, 2)) || 0;
    let avg = Number(getVal(i, 3)) || 0;
    if (m1 > 0 && m1 < 1) m1 = Number((m1 * 100).toFixed(2));
    if (m2 > 0 && m2 < 1) m2 = Number((m2 * 100).toFixed(2));
    if (avg > 0 && avg < 1) avg = Number((avg * 100).toFixed(2));

    moisture_report.push({
      item_name: item,
      maida_1: m1,
      maida_2: m2,
      average: avg
    });
  }
}

console.log('=== TEST RESULT FOR ALL 4 MODULES ===');
console.log('1. POWER UNITS:', { power_units, power_rate_per_unit });
console.log('2. LAB REPORT:', lab_report);
console.log('3. ATTENDANCE:', attendance);
console.log('4. MOISTURE REPORT:', moisture_report);
