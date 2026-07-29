import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import ExcelJS from 'exceljs';
import fs from 'fs';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateToken);

async function parseAndSaveExcel(buffer, originalname, db, user) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
    
  // 1. Detect report_date from filename (e.g. REPORT -01-07-26.xlsx -> 2026-07-01) or default to today
  let report_date = new Date().toISOString().split('T')[0];
  const dateMatch = (originalname || '').match(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/);
    if (dateMatch) {
      let dd = Number(dateMatch[1]);
      let mm = Number(dateMatch[2]);
      let yyyy = Number(dateMatch[3]);
      if (yyyy < 100) yyyy += 2000;
      if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
        report_date = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
      }
    }

    const reportSheetName = workbook.SheetNames.find(n => n.toUpperCase().includes('REPORT DATA') || n.toUpperCase().includes('REPORT')) || workbook.SheetNames[0];
    const padtalSheetName = workbook.SheetNames.find(n => n.toUpperCase().includes('PARTAL') || n.toUpperCase().includes('PADTAL') || n.toUpperCase().includes('YIELD')) || workbook.SheetNames[1] || workbook.SheetNames[0];

    const sheet = workbook.Sheets[reportSheetName];
    const padtalSheet = workbook.Sheets[padtalSheetName];

    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const padtalRows = xlsx.utils.sheet_to_json(padtalSheet, { header: 1, defval: '' });

    // Helper to find row index of any matching keyword with space normalization
    const findRow = (...keywords) => rows.findIndex(r => r && r.some(c => {
      const str = String(c).toUpperCase().replace(/\s+/g, ' ').trim();
      return keywords.some(k => str.includes(k.toUpperCase().replace(/\s+/g, ' ').trim()));
    }));
    const findPadtalRow = (...keywords) => {
      let idx = padtalRows.findIndex(r => r && r.some(c => {
        const str = String(c).toUpperCase().replace(/\s+/g, ' ').trim();
        return keywords.some(k => str.includes(k.toUpperCase().replace(/\s+/g, ' ').trim()));
      }));
      if (idx === -1) {
        idx = rows.findIndex(r => r && r.some(c => {
          const str = String(c).toUpperCase().replace(/\s+/g, ' ').trim();
          return keywords.some(k => str.includes(k.toUpperCase().replace(/\s+/g, ' ').trim()));
        }));
      }
      return idx;
    };

    // Helper to safely get cell from 2D array
    const getVal = (r, c) => (rows[r] && rows[r][c]) ? rows[r][c] : 0;
    const getStr = (r, c) => (rows[r] && rows[r][c]) ? String(rows[r][c]).trim() : '';
    const getPadtalVal = (r, c) => (padtalRows[r] && padtalRows[r][c]) ? padtalRows[r][c] : ((rows[r] && rows[r][c]) ? rows[r][c] : 0);
    const getPadtalStr = (r, c) => (padtalRows[r] && padtalRows[r][c]) ? String(padtalRows[r][c]).trim() : ((rows[r] && rows[r][c]) ? String(rows[r][c]).trim() : '');
    const pick = (r, ...cols) => {
      for (const c of cols) {
        if (rows[r] && rows[r][c] !== undefined && rows[r][c] !== '') return rows[r][c];
      }
      return 0;
    };

    const grindRow = findRow('मिल पिसाई', 'MILL GRINDING', 'GRINDING');
    const pRow = grindRow !== -1 ? grindRow : 25; 

    const parentData = {
        mill_grinding: Number(getVal(pRow, 1)) || 0,
        chakki_grinding: Number(getVal(pRow+1, 1)) || 0,
        bran_fine: Number(getVal(pRow+7, 1)) || 0,
        bran_super_delux: Number(getVal(pRow+8, 1)) || 0,
        bran_delux: Number(getVal(pRow+9, 1)) || 0,
        bran_coarse: Number(getVal(pRow+10, 1)) || 0,
        bran_chakki: Number(getVal(pRow+12, 1)) || 0,
        bran_load: Number(getVal(pRow+13, 1)) || 0,
        bran_bhushi: Number(getVal(pRow+14, 1)) || 0,
        bran_calcium: Number(getVal(pRow+15, 1)) || 0,
        bran_kanki: Number(getVal(pRow+16, 1)) || 0,
        power_units: 0,
        power_rate_per_unit: 0,
        wheat_opening: 0, 
        wheat_received: 0 
    };

    const powerRow = findRow('UNIT CONSUMED', 'POWER', 'CONSUMED');
    if(powerRow !== -1) {
        parentData.power_units = Number(pick(powerRow, 1, 2));
        parentData.power_rate_per_unit = Number(getVal(powerRow+3, 1)) || 0;
    }

    const lab_report = { wp: 0, ash: 0, gluten: 0, sedimentation: 0, bread_height: 0 };
    const labRow = findRow('W.P', 'LAB REPORT', 'QUALITY');
    if(labRow !== -1) {
       lab_report.wp = parseFloat(pick(labRow, 6, 5)) || 0;
       lab_report.ash = parseFloat(pick(labRow, 9, 8)) || 0;
       lab_report.gluten = parseFloat(pick(labRow+1, 6, 5)) || 0;
       lab_report.sedimentation = parseFloat(pick(labRow+1, 9, 8)) || 0;
       lab_report.bread_height = parseFloat(pick(labRow+2, 6, 5)) || 0;
    }

    const parseGrid2D = (startRow, numRows, nameIdx, kattaIdx, qtlIdx, amtIdx = null) => {
      const arr = [];
      if(startRow === -1) return arr;
      for(let i = startRow; i < startRow + numRows; i++){
        const name = getStr(i, nameIdx);
        if(name && !name.toUpperCase().includes('TOTAL') && name !== '0' && name !== 'PRODUCT' && name !== 'PRODUCTS') {
          arr.push({
            name,
            katta: Number(getVal(i, kattaIdx)) || 0,
            qtl: Number(getVal(i, qtlIdx)) || 0,
            amount: amtIdx ? (Number(getVal(i, amtIdx)) || 0) : 0
          });
        }
      }
      return arr;
    };

    const finishRow = findRow('FINISH STOCK', 'FINISH  STOCK', 'FINISH');
    const finishStart = finishRow !== -1 ? finishRow + 2 : 5;
    
    const finish_stock = parseGrid2D(finishStart, 16, 0, 2, 3);
    const sales_report = parseGrid2D(finishStart, 16, 5, 6, 8, 10);
    const sales_pending = parseGrid2D(finishStart, 16, 11, 12, 14, 15);
    const todays_production = parseGrid2D(pRow, 16, 5, 6, 8);

    // Salesman Wise Sales
    const salesman_sales = [];
    const smRow = findRow('SALESMAN', 'PARTY WISE', 'SALESMAN WISE');
    const smStart = smRow !== -1 ? smRow + 2 : -1;
    if (smStart !== -1) {
      for (let i = smStart; i < smStart + 35; i++) {
        const smName = getStr(i, 0) || getStr(i, 1);
        const prodName = getStr(i, 1) || getStr(i, 2);
        if (smName && !smName.toUpperCase().includes('TOTAL') && smName !== 'SALESMAN' && prodName && !prodName.toUpperCase().includes('TOTAL')) {
          salesman_sales.push({
            salesman_name: smName,
            product_name: prodName,
            katta: Number(getVal(i, 2)) || Number(getVal(i, 3)) || 0,
            qtl: Number(getVal(i, 3)) || Number(getVal(i, 4)) || 0,
            amount: Number(getVal(i, 4)) || Number(getVal(i, 5)) || 0
          });
        }
      }
    }

    const attRow = findRow('PRESENT', 'ATTENDANCE');
    const attendance = [];
    if(attRow !== -1) {
        for(let i=attRow+1; i<=attRow+8; i++) {
            const dept = getStr(i, 0);
            if(dept && !dept.toUpperCase().includes('TOTAL')) {
                attendance.push({
                    department: dept,
                    present: Number(getVal(i, 3)) || 0,
                    absent: Number(getVal(i, 4)) || 0
                });
            }
        }
    }

  const padtal_data = { yield_detail: [], expenses: [], wheat_rate: 0 };
  if (padtalRows.length > 0) {
    let yieldSectionStart = -1;
    let expSectionStart = -1;
    for (let r = 0; r < padtalRows.length; r++) {
      const row = padtalRows[r];
      if (!row || row.length === 0) continue;
      const col0 = String(row[0]).trim().toUpperCase();
      if (col0.includes('PRODUCTS') || col0.includes('YIELD IN %') || (row[1] && String(row[1]).toUpperCase().includes('YIELD'))) {
        yieldSectionStart = r + 1;
      }
      if (col0.includes('EXPENSE') || col0.includes('GRINDING EXP') || col0.includes('COST')) {
        expSectionStart = r + 1;
      }
      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c]).trim().toUpperCase();
        if (cell.includes('WHEAT RATE') || cell.includes('WHEAT COST')) {
          const val = Number(row[c + 1]) || Number(row[c + 2]) || 0;
          if (val > 0) padtal_data.wheat_rate = val;
        }
      }
    }

    if (yieldSectionStart !== -1) {
      for (let r = yieldSectionStart; r < Math.min(yieldSectionStart + 20, padtalRows.length); r++) {
        const row = padtalRows[r];
        if (!row || !row[0]) continue;
        const pName = String(row[0]).trim();
        if (pName.toUpperCase().includes('TOTAL') || pName.toUpperCase().includes('REALIZATION')) break;
        padtal_data.yield_detail.push({
          product_name: pName,
          yield_percent: Number(row[1]) || 0,
          rate_per_bag: Number(row[2]) || 0,
          rate_per_kg: Number(row[3]) || 0,
          avg_rate: Number(row[4]) || 0
        });
      }
    }

    if (expSectionStart !== -1) {
      for (let r = expSectionStart; r < Math.min(expSectionStart + 15, padtalRows.length); r++) {
        const row = padtalRows[r];
        if (!row || !row[0]) continue;
        const eName = String(row[0]).trim();
        if (eName.toUpperCase().includes('TOTAL')) break;
        const eAmt = Number(row[1]) || Number(row[2]) || 0;
        if (eAmt > 0) {
          padtal_data.expenses.push({ expense_name: eName, amount: eAmt });
        }
      }
    }
  }

  try {
    const getPid = async (name) => {
      if (!name) return 1;
      const cleanName = String(name).trim();
      const existing = await db('master_products').whereRaw('LOWER(name) = ?', [cleanName.toLowerCase()]).first();
      if (existing) return existing.id;
      const [newPid] = await db('master_products').insert({ name: cleanName, is_active: 1 });
      return typeof newPid === 'object' ? newPid.id : newPid;
    };

    const getSmId = async (name) => {
      if (!name) return 1;
      const cleanName = String(name).trim();
      const existing = await db('master_salesmen').whereRaw('LOWER(name) = ?', [cleanName.toLowerCase()]).first();
      if (existing) return existing.id;
      const [newSmId] = await db('master_salesmen').insert({ name: cleanName, is_active: 1 });
      return typeof newSmId === 'object' ? newSmId.id : newSmId;
    };

    const getEid = async (name) => {
      if (!name) return 1;
      const cleanName = String(name).trim();
      const existing = await db('master_expenses').whereRaw('LOWER(name) = ?', [cleanName.toLowerCase()]).first();
      if (existing) return existing.id;
      const [newEid] = await db('master_expenses').insert({ name: cleanName, is_active: 1 });
      return typeof newEid === 'object' ? newEid.id : newEid;
    };

    let padtalReport = await db('padtal_reports').where({ report_date }).first();
    if (padtalReport) {
      await db('padtal_reports').where({ id: padtalReport.id }).update({
        wheat_rate: padtal_data.wheat_rate || 0,
        updated_at: db.fn.now()
      });
    } else {
      const [newId] = await db('padtal_reports').insert({
        report_date,
        wheat_rate: padtal_data.wheat_rate || 0,
        difference_percent: 0,
        created_by: user ? user.id : 1
      });
      padtalReport = { id: typeof newId === 'object' ? newId.id : newId };
    }
    if (padtalReport && padtal_data.yield_detail && padtal_data.yield_detail.length > 0) {
      await db('padtal_yield_detail').where({ report_id: padtalReport.id }).del();
      const toInsert = [];
      for (const item of padtal_data.yield_detail) {
        const pid = await getPid(item.product_name || item.name);
        toInsert.push({
          report_id: padtalReport.id,
          product_id: pid,
          yield_percent: item.yield_percent || 0,
          rate_per_bag: item.rate_per_bag || 0,
          rate_per_kg: item.rate_per_kg || 0,
          avg_rate: item.avg_rate || 0
        });
      }
      if (toInsert.length > 0) {
        await db('padtal_yield_detail').insert(toInsert);
      }
    }
    if (padtalReport && padtal_data.expenses && padtal_data.expenses.length > 0) {
      await db('padtal_expenses').where({ report_id: padtalReport.id }).del();
      const expInsert = [];
      for (const exp of padtal_data.expenses) {
        const eid = await getEid(exp.expense_name || exp.name);
        expInsert.push({
          report_id: padtalReport.id,
          expense_id: eid,
          amount: exp.amount || 0
        });
      }
      if (expInsert.length > 0) {
        await db('padtal_expenses').insert(expInsert);
      }
    }

    let dailyReport = await db('daily_mill_reports').where({ report_date }).first();
    if (dailyReport) {
      await db('daily_mill_reports').where({ id: dailyReport.id }).update({
        ...parentData,
        updated_at: db.fn.now()
      });
    } else {
      const [newDmrId] = await db('daily_mill_reports').insert({
        report_date,
        created_by: user ? user.id : 1,
        ...parentData
      });
      dailyReport = { id: typeof newDmrId === 'object' ? newDmrId.id : newDmrId };
    }
    if (dailyReport) {
      const dmrId = dailyReport.id;
      if (finish_stock && finish_stock.length > 0) {
        await db('dmr_finish_stock').where({ report_id: dmrId }).del();
        const rows = [];
        for (const i of finish_stock) {
          rows.push({ report_id: dmrId, product_id: await getPid(i.product_name || i.name), katta: i.katta || 0, qtl: i.qtl || 0 });
        }
        if (rows.length > 0) await db('dmr_finish_stock').insert(rows);
      }
      if (sales_report && sales_report.length > 0) {
        await db('dmr_sales_report').where({ report_id: dmrId }).del();
        const rows = [];
        for (const i of sales_report) {
          rows.push({ report_id: dmrId, product_id: await getPid(i.product_name || i.name), katta: i.katta || 0, qtl: i.qtl || 0, amount: i.amount || 0 });
        }
        if (rows.length > 0) await db('dmr_sales_report').insert(rows);
      }
      if (sales_pending && sales_pending.length > 0) {
        await db('dmr_sales_pending').where({ report_id: dmrId }).del();
        const rows = [];
        for (const i of sales_pending) {
          rows.push({ report_id: dmrId, product_id: await getPid(i.product_name || i.name), katta: i.katta || 0, qtl: i.qtl || 0, amount: i.amount || 0 });
        }
        if (rows.length > 0) await db('dmr_sales_pending').insert(rows);
      }
      if (todays_production && todays_production.length > 0) {
        await db('dmr_todays_production').where({ report_id: dmrId }).del();
        const rows = [];
        for (const i of todays_production) {
          rows.push({ report_id: dmrId, product_id: await getPid(i.product_name || i.name), katta: i.katta || 0, qtl: i.qtl || 0 });
        }
        if (rows.length > 0) await db('dmr_todays_production').insert(rows);
      }
      if (salesman_sales && salesman_sales.length > 0) {
        await db('dmr_salesman_sales').where({ report_id: dmrId }).del();
        const rows = [];
        for (const i of salesman_sales) {
          rows.push({ report_id: dmrId, salesman_id: await getSmId(i.salesman_name), product_id: await getPid(i.product_name || i.name), katta: i.katta || 0, qtl: i.qtl || 0, amount: i.amount || 0 });
        }
        if (rows.length > 0) await db('dmr_salesman_sales').insert(rows);
      }
      if (attendance && attendance.length > 0) {
        await db('dmr_attendance').where({ report_id: dmrId }).del();
        const rows = attendance.map(a => ({ report_id: dmrId, department: a.department || '', total: a.total || 0, present: a.present || 0, absent: a.absent || 0 }));
        await db('dmr_attendance').insert(rows);
      }
      if (lab_report) {
        await db('dmr_lab_report').where({ report_id: dmrId }).del();
        await db('dmr_lab_report').insert({ report_id: dmrId, ...lab_report });
      }
    }
  } catch (dbErr) {
    console.error('Auto-save Reports note:', dbErr.message);
  }

  return { report_date, parentData, lab_report, finish_stock, sales_report, sales_pending, todays_production, attendance, salesman_sales, padtal_data };
}

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const parsedData = await parseAndSaveExcel(req.file.buffer, req.file.originalname, db, req.user);
    res.json({ success: true, parsedData });
  } catch (error) {
    console.error('Excel parse error:', error);
    res.status(500).json({ error: 'Parse failed: ' + error.message });
  }
});

router.post('/bulk-upload', upload.any(), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    const processedDates = [];
    const failedFiles = [];
    for (const file of req.files) {
      try {
        const parsedData = await parseAndSaveExcel(file.buffer, file.originalname, db, req.user);
        if (parsedData && parsedData.report_date) {
          processedDates.push(parsedData.report_date);
        }
      } catch (err) {
        console.error(`Bulk upload error for ${file.originalname}:`, err.message);
        failedFiles.push({ file: file.originalname, error: err.message });
      }
    }
    processedDates.sort();
    res.json({ success: true, count: processedDates.length, processedDates, failedFiles });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ error: 'Bulk upload failed: ' + error.message });
  }
});

router.get('/export/:date', async (req, res) => {
  try {
    const report_date = req.params.date;
    const report = await db('daily_mill_reports').where({ report_date }).first();
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const fetchTable = async (table) => await db(table).join('master_products', `${table}.product_id`, 'master_products.id').where({ report_id: report.id }).select(`${table}.*`, 'master_products.name as product_name');
    
    const finish_stock = await fetchTable('dmr_finish_stock');
    const sales_report = await fetchTable('dmr_sales_report');
    const sales_pending = await fetchTable('dmr_sales_pending');
    const todays_production = await fetchTable('dmr_todays_production');
    const attendance = await db('dmr_attendance').where({ report_id: report.id });
    const lab_report = await db('dmr_lab_report').where({ report_id: report.id }).first();

    // Load original template to preserve all formatting and formulas
    const workbook = new ExcelJS.Workbook();
    const fs = await import('fs');
    const path = await import('path');
    const findTemplatePath = () => {
      const candidates = [
        path.resolve('../REPORT -01-07-26.xlsx'),
        path.resolve('../REPORT.xlsx'),
        path.resolve('REPORT -01-07-26.xlsx'),
        path.resolve('REPORT.xlsx'),
        path.resolve('../../REPORT -01-07-26.xlsx'),
        path.resolve('../../REPORT.xlsx')
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) return p;
      }
      for (const dir of [path.resolve('..'), path.resolve('.'), path.resolve('../..')]) {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx') && !f.startsWith('~'));
          if (files.length > 0) return path.join(dir, files[0]);
        }
      }
      return null;
    };
    const templatePath = findTemplatePath();
    if (!templatePath) {
      return res.status(500).json({ error: 'Excel template (.xlsx) file not found on server' });
    }
    await workbook.xlsx.readFile(templatePath);
    
    const sheet = workbook.worksheets.find(w => w.name.toUpperCase().includes('REPORT DATA')) || workbook.worksheets[0];

    // Helper to find a row index containing a keyword (exceljs is 1-indexed)
    const findRowIdx = (keyword) => {
        let foundIdx = -1;
        sheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
                if (String(cell.value).toUpperCase().includes(keyword.toUpperCase())) {
                    foundIdx = rowNumber;
                }
            });
        });
        return foundIdx;
    };

    // Helper to inject a grid of data
    const injectGrid = (startRow, nameCol, kattaCol, qtlCol, amtCol, data) => {
        if (startRow === -1 || !data || data.length === 0) return;
        let rIdx = startRow;
        
        // We match by product name to put it in the exact right slot
        // Alternatively, we could just overwrite the list, but it's safer to map to existing names in the template
        for(let r = startRow; r < startRow + 20; r++) {
            const row = sheet.getRow(r);
            const cellName = String(row.getCell(nameCol).value || '').trim();
            if (cellName && !cellName.toUpperCase().includes('TOTAL')) {
                // Find matching product in DB data
                const dbItem = data.find(d => cellName.toLowerCase().replace(/\\s/g,'').includes(d.product_name.toLowerCase().replace(/\\s/g,'')) || 
                                              d.product_name.toLowerCase().replace(/\\s/g,'').includes(cellName.toLowerCase().replace(/\\s/g,'')));
                if (dbItem) {
                    row.getCell(kattaCol).value = dbItem.katta || 0;
                    row.getCell(qtlCol).value = dbItem.qtl || 0;
                    if (amtCol && dbItem.amount) row.getCell(amtCol).value = dbItem.amount || 0;
                }
            }
        }
    };

    const finishRow = findRowIdx('FINISH  STOCK');
    const fStart = finishRow !== -1 ? finishRow + 2 : 5;
    
    injectGrid(fStart, 1, 3, 4, null, finish_stock); // A=1, C=3, D=4
    injectGrid(fStart, 6, 7, 9, 11, sales_report);   // F=6, G=7, I=9, K=11
    injectGrid(fStart, 12, 13, 15, 16, sales_pending); // L=12, M=13, O=15, P=16

    const grindRow = findRowIdx('मिल पिसाई');
    const pStart = grindRow !== -1 ? grindRow : 27;
    injectGrid(pStart, 6, 7, 9, null, todays_production); // F=6, G=7, I=9

    // Inject Parent Data
    if(grindRow !== -1) {
        sheet.getRow(grindRow).getCell(2).value = report.mill_grinding;
        sheet.getRow(grindRow+1).getCell(2).value = report.chakki_grinding;
        sheet.getRow(grindRow+7).getCell(2).value = report.bran_fine;
        sheet.getRow(grindRow+8).getCell(2).value = report.bran_super_delux;
        sheet.getRow(grindRow+9).getCell(2).value = report.bran_delux;
        sheet.getRow(grindRow+10).getCell(2).value = report.bran_coarse;
        sheet.getRow(grindRow+12).getCell(2).value = report.bran_chakki;
        sheet.getRow(grindRow+13).getCell(2).value = report.bran_load;
        sheet.getRow(grindRow+14).getCell(2).value = report.bran_bhushi;
        sheet.getRow(grindRow+15).getCell(2).value = report.bran_calcium;
        sheet.getRow(grindRow+16).getCell(2).value = report.bran_kanki;
    }

    const powerRow = findRowIdx('UNIT CONSUMED');
    if (powerRow !== -1) {
        sheet.getRow(powerRow).getCell(2).value = report.power_units;
        sheet.getRow(powerRow+3).getCell(2).value = report.power_rate_per_unit;
    }

    const labRow = findRowIdx('W.P');
    if (labRow !== -1 && lab_report) {
        sheet.getRow(labRow).getCell(6).value = lab_report.wp;
        sheet.getRow(labRow).getCell(9).value = lab_report.ash;
        sheet.getRow(labRow+1).getCell(6).value = lab_report.gluten;
        sheet.getRow(labRow+1).getCell(9).value = lab_report.sedimentation;
        sheet.getRow(labRow+2).getCell(6).value = lab_report.bread_height;
    }

    const attRow = findRowIdx('ATTENDANCE');
    if (attRow !== -1 && attendance) {
        for(let r = attRow+2; r <= attRow+9; r++) {
            const row = sheet.getRow(r);
            const dept = String(row.getCell(1).value || '').trim();
            if(dept && !dept.toUpperCase().includes('TOTAL')) {
                const dbAtt = attendance.find(a => a.department.toUpperCase() === dept.toUpperCase());
                if(dbAtt) {
                    row.getCell(4).value = dbAtt.present || 0;
                    row.getCell(5).value = dbAtt.absent || 0;
                }
            }
        }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Report_${report_date}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

export default router;
