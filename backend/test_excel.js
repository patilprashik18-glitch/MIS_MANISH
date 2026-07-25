import xlsx from 'xlsx';
import path from 'path';

try {
  const workbook = xlsx.readFile(path.join('..', 'REPORT.xlsx'));
  const sheetName = workbook.SheetNames.find(n => n.toUpperCase().includes('REPORT DATA'));
  console.log('Sheet found:', sheetName);
  const sheet = workbook.Sheets[sheetName || workbook.SheetNames[0]];

  const getCell = (c) => sheet[c] ? sheet[c].v : 0;
  const getString = (c) => sheet[c] ? String(sheet[c].v).trim() : '';

  const parseGrid = (startRow, endRow, nameCol, kattaCol, qtlCol, amountCol = null) => {
    const arr = [];
    for(let i=startRow; i<=endRow; i++){
      const name = getString(nameCol+i);
      if(name && name !== 'TOTAL' && name !== '0') {
        arr.push({
          name,
          katta: Number(getCell(kattaCol+i)) || 0,
          qtl: Number(getCell(qtlCol+i)) || 0,
          amount: amountCol ? (Number(getCell(amountCol+i)) || 0) : 0
        });
      }
    }
    return arr;
  };

  const finish_stock = parseGrid(6, 21, 'A', 'C', 'D');
  console.log('Finish Stock:', finish_stock);

} catch(err) {
  console.error(err);
}
