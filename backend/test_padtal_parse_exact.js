import fs from 'fs';
import xlsx from 'xlsx';

const buffer = fs.readFileSync('t:\\Manish MIS\\REPORT -01-07-26.xlsx');
const workbook = xlsx.read(buffer, { type: 'buffer' });
const padtalSheetName = workbook.SheetNames.find(n => n.toUpperCase().includes('PARTAL') || n.toUpperCase().includes('PADTAL')) || workbook.SheetNames[1];
const padtalSheet = workbook.Sheets[padtalSheetName];
const padtalRows = xlsx.utils.sheet_to_json(padtalSheet, { header: 1, defval: '' });

const padtal_data = {
  wheat_rate: 0,
  wheat_net_avg_rate: 0,
  grinding_expense: 250,
  moisture_adjustment: 0,
  final_margin: 0,
  yield_detail: []
};

let yieldSectionStart = -1;
for (let r = 0; r < padtalRows.length; r++) {
  const row = padtalRows[r];
  if (!row) continue;
  const col0 = String(row[0]).trim().toUpperCase();
  if (col0 === 'PRODUCTS' || col0.includes('YIELD IN')) {
    yieldSectionStart = r + 1;
  }
  for (let c = 0; c < row.length; c++) {
    const cell = String(row[c]).trim().toUpperCase();
    if (cell.includes('WHEAT NET AVG RATE') || cell.includes('WHEAT RATE LESS 4%')) {
      const val = Number(row[c + 1]) || Number(row[c + 2]) || 0;
      if (val !== 0) padtal_data.wheat_net_avg_rate = val;
    }
    if (cell === 'GRD EXP.' || cell.includes('GRD EXP') || cell.includes('GRINDING EXP')) {
      const val = Number(row[c + 1]) || Number(row[c + 2]) || 0;
      if (val !== 0) padtal_data.grinding_expense = val;
    }
    if (cell.includes('MOISTURE @ 3%') || cell.includes('MOISTURE @')) {
      const val = Number(row[c + 1]) || Number(row[c + 2]) || 0;
      if (val !== 0) padtal_data.moisture_adjustment = val;
    }
    if (cell === 'FINAL' || cell.startsWith('FINAL ')) {
      const val = Number(row[c + 1]) || Number(row[c + 2]) || 0;
      if (val !== 0) padtal_data.final_margin = val;
    }
  }
}

if (yieldSectionStart !== -1) {
  for (let r = yieldSectionStart; r < Math.min(yieldSectionStart + 20, padtalRows.length); r++) {
    const row = padtalRows[r];
    if (!row || !row[0]) continue;
    const pName = String(row[0]).trim();
    if (pName.toUpperCase().includes('TOTAL') || pName.toUpperCase().includes('REALIZATION')) break;
    const yPct = Number(row[2]) || 0;
    const rBag = Number(row[3]) || 0;
    const rKg = Number(row[4]) || 0;
    const aRate = yPct > 0 ? (Number(row[5]) || 0) : 0;
    padtal_data.yield_detail.push({
      product_name: pName,
      yield_percent: yPct,
      rate_per_bag: rBag,
      rate_per_kg: rKg,
      avg_rate: aRate
    });
  }
}

console.log('EXTRACTED PRODUCTS COUNT:', padtal_data.yield_detail.length);
padtal_data.yield_detail.forEach((p, idx) => {
  console.log(`  ${idx + 1}. ${p.product_name} - Yield: ${p.yield_percent}%, RateBag: ${p.rate_per_bag}, RateKG: ${p.rate_per_kg}, AvgRate: ${p.avg_rate}`);
});

const totalRealization = padtal_data.yield_detail.reduce((sum, item) => sum + item.avg_rate, 0);
console.log('\n--- EXTRACTED SUMMARY & FORMULA VERIFICATION ---');
console.log('Total Realization Value:', totalRealization.toFixed(2));
console.log('Wheat Net Avg Rate:     ', padtal_data.wheat_net_avg_rate.toFixed(2));
const diff = totalRealization - padtal_data.wheat_net_avg_rate;
console.log('Difference:             ', diff.toFixed(2));
console.log('Grinding Expense:       ', padtal_data.grinding_expense.toFixed(2));
console.log('Moisture @ 3%:          ', padtal_data.moisture_adjustment.toFixed(2));
const finalMargin = diff - padtal_data.grinding_expense + padtal_data.moisture_adjustment;
console.log('Calculated Final:       ', finalMargin.toFixed(2));
