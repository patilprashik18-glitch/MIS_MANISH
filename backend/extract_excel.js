import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';

try {
  const workbook = xlsx.readFile(path.join('..', 'REPORT.xlsx'));
  let output = '';
  for (const sheetName of workbook.SheetNames) {
    output += `\n--- Sheet: ${sheetName} ---\n`;
    const sheet = workbook.Sheets[sheetName];
    // Extract first 100 rows to keep it concise but get all headers/data
    output += xlsx.utils.sheet_to_csv(sheet).split('\n').slice(0, 100).join('\n'); 
  }
  fs.writeFileSync('excel_output.txt', output);
  console.log('Successfully created excel_output.txt in the backend folder.');
} catch (error) {
  console.error('Error reading the excel file:', error);
}
