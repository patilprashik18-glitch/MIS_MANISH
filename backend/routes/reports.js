import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

const todayStr = () => new Date().toISOString().split('T')[0];

// Users can create/edit reports for any date without lock
const canEditDate = (user, report_date) => true;

// --- Audit logging helpers -------------------------------------------------
// Only edits to an *existing* report are logged (not the initial creation) -
// the audit trail is meant to answer "who changed X from Y to Z", and logging
// every field on first entry would just be noise duplicating the report itself.

const valuesEqual = (a, b) => {
  const na = a === undefined || a === null ? '' : a;
  const nb = b === undefined || b === null ? '' : b;
  const numA = Number(na), numB = Number(nb);
  if (na !== '' && nb !== '' && !isNaN(numA) && !isNaN(numB)) return numA === numB;
  return String(na) === String(nb);
};

const diffScalarFields = (entries, ctx, labels, oldObj, newObj) => {
  Object.entries(labels).forEach(([key, label]) => {
    const oldVal = oldObj ? oldObj[key] : undefined;
    const newVal = newObj ? newObj[key] : undefined;
    if (newVal === undefined) return; // field not part of this save payload
    if (!valuesEqual(oldVal, newVal)) {
      entries.push({ ...ctx, field_name: label, old_value: oldVal ?? null, new_value: newVal ?? null });
    }
  });
};

// keyOf/labelOf may be a column name (string) or a function of the row, so composite
// keys (e.g. salesman_id + product_id) and composite labels can be expressed too.
const diffRepeatingRows = (entries, ctx, sectionLabel, oldRows, newRows, keyOf, cols, labelOf) => {
  const key = typeof keyOf === 'function' ? keyOf : (r) => String(r[keyOf]);
  const label = typeof labelOf === 'function' ? labelOf : (r) => r[labelOf];
  const oldMap = new Map((oldRows || []).map(r => [key(r), r]));
  const newMap = new Map((newRows || []).map(r => [key(r), r]));
  const allKeys = new Set([...oldMap.keys(), ...newMap.keys()]);
  allKeys.forEach(k => {
    const oldRow = oldMap.get(k);
    const newRow = newMap.get(k);
    const rowLabel = (newRow && label(newRow)) || (oldRow && label(oldRow)) || k;
    cols.forEach(col => {
      const oldVal = oldRow ? oldRow[col] : 0;
      const newVal = newRow ? newRow[col] : 0;
      if (!valuesEqual(oldVal, newVal)) {
        entries.push({ ...ctx, field_name: `${sectionLabel} - ${rowLabel} - ${col}`, old_value: oldVal ?? null, new_value: newVal ?? null });
      }
    });
  });
};

const DAILY_FIELD_LABELS = {
  mill_grinding: 'Mill Grinding',
  chakki_grinding: 'Chakki Grinding',
  bran_fine: 'Fine Bran',
  bran_super_delux: 'Super Delux Bran',
  bran_delux: 'Delux Bran',
  bran_coarse: 'Coarse Bran',
  bran_chakki: 'Bran Chakki',
  bran_load: 'Load',
  bran_bhushi: 'Bhushi',
  bran_bhushi_2: 'Bhushi 2',
  bran_calcium: 'Calcium',
  bran_kanki: 'Kanki',
  moisture_maida_percent: 'Moisture Maida %',
  moisture_average_percent: 'Moisture Average %',
  moisture_wheat_percent: 'Moisture Wheat %',
  stop_hours: 'Stop Hours',
  running_hours: 'Running Hours',
  wheat_opening: 'Wheat Opening',
  wheat_received: 'Wheat Received',
  wheat_purchase_rate: 'Wheat Purchase Rate',
  power_units: 'Power Units',
  power_rate_per_unit: 'Power Rate/Unit',
};

const LAB_FIELD_LABELS = {
  wp: 'W.P %',
  ash: 'Ash %',
  gluten: 'Gluten %',
  sedimentation: 'Sedimentation',
  bread_height: 'Bread Height (mm)',
};

const PADTAL_FIELD_LABELS = {
  wheat_rate: 'Wheat Rate',
  wheat_lot_reference: 'Wheat Lot Reference',
  notes: 'Notes',
  difference_percent: 'Margin Difference %',
};

// Get Daily Mill Report by Date
router.get('/daily/:date', async (req, res) => {
  try {
    const report = await db('daily_mill_reports').where({ report_date: req.params.date }).first();
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    const report_id = report.id;
    const fetchTable = async (table) => await db(table)
      .leftJoin('master_products', `${table}.product_id`, 'master_products.id')
      .where({ report_id })
      .select(`${table}.*`, 'master_products.name as product_name', 'master_products.name as name');

    const finish_stock = await fetchTable('dmr_finish_stock');
    const sales_report = await fetchTable('dmr_sales_report');
    const sales_pending = await fetchTable('dmr_sales_pending');
    const todays_production = await fetchTable('dmr_todays_production');
    const salesman_sales = await db('dmr_salesman_sales')
      .leftJoin('master_salesmen', 'dmr_salesman_sales.salesman_id', 'master_salesmen.id')
      .leftJoin('master_products', 'dmr_salesman_sales.product_id', 'master_products.id')
      .where({ report_id })
      .select('dmr_salesman_sales.*', 'master_salesmen.name as salesman_name', 'master_products.name as product_name');
    const jute_bags = await db('dmr_jute_bags').where({ report_id });
    const wheat_locations = await db('dmr_wheat_locations').where({ report_id });
    const attendance = await db('dmr_attendance').where({ report_id });
    const moisture = await db('dmr_moisture').where({ report_id });
    const lab_report = await db('dmr_lab_report').where({ report_id }).first();

    res.json({
      ...report,
      finish_stock,
      sales_report,
      sales_pending,
      todays_production,
      salesman_sales,
      jute_bags,
      wheat_locations,
      attendance,
      moisture,
      lab_report
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save Daily Mill Report
router.post('/daily', async (req, res) => {
  const trx = await db.transaction();
  try {
    const {
      report_date, parentData, finish_stock, sales_report, sales_pending, todays_production,
      salesman_sales, jute_bags, wheat_locations, attendance, moisture, lab_report
    } = req.body;

    if (!canEditDate(req.user, report_date)) {
      await trx.rollback();
      return res.status(403).json({ error: 'Mill Floor users can only create or edit today\'s report. Past dates are read-only.' });
    }

    let report = await trx('daily_mill_reports').where({ report_date }).first();
    let report_id;
    const isUpdate = !!report;

    // Snapshot old state before any writes, only needed if this is an edit to an existing report
    let oldChild = null;
    if (isUpdate) {
      report_id = report.id;
      const fetchOld = async (table) => await trx(table).where({ report_id });
      oldChild = {
        finish_stock: await fetchOld('dmr_finish_stock'),
        sales_report: await fetchOld('dmr_sales_report'),
        sales_pending: await fetchOld('dmr_sales_pending'),
        todays_production: await fetchOld('dmr_todays_production'),
        salesman_sales: await fetchOld('dmr_salesman_sales'),
        attendance: await fetchOld('dmr_attendance'),
        moisture: await fetchOld('dmr_moisture'),
        lab_report: await trx('dmr_lab_report').where({ report_id }).first(),
      };
    }

    if (report) {
      await trx('daily_mill_reports').where({ id: report.id }).update(parentData);
      report_id = report.id;
    } else {
      const inserted = await trx('daily_mill_reports').insert({
        report_date,
        created_by: req.user.id,
        ...parentData
      }).returning('id');
      report_id = typeof inserted[0] === 'object' ? inserted[0].id : inserted[0];
    }

    const resolveProductId = async (name, existingId) => {
      if (existingId && Number(existingId) > 0) return Number(existingId);
      if (!name) return 1;
      const cleanName = String(name).trim();
      const existing = await trx('master_products').whereRaw('LOWER(name) = ?', [cleanName.toLowerCase()]).first();
      if (existing) return existing.id;
      const inserted = await trx('master_products').insert({ name: cleanName, is_active: 1 }).returning('id');
      return typeof inserted[0] === 'object' ? inserted[0].id : inserted[0];
    };

    const resolveSalesmanId = async (name, existingId) => {
      if (existingId && Number(existingId) > 0) return Number(existingId);
      if (!name) return 1;
      const cleanName = String(name).trim();
      const existing = await trx('master_salesmen').whereRaw('LOWER(name) = ?', [cleanName.toLowerCase()]).first();
      if (existing) return existing.id;
      const inserted = await trx('master_salesmen').insert({ name: cleanName, is_active: 1 }).returning('id');
      return typeof inserted[0] === 'object' ? inserted[0].id : inserted[0];
    };

    const saveRepeatingProducts = async (tableName, dataArray, includeAmount) => {
      await trx(tableName).where({ report_id }).delete();
      if (dataArray && dataArray.length > 0) {
        const rows = [];
        for (const item of dataArray) {
          const pid = await resolveProductId(item.name || item.product_name, item.product_id);
          const row = { report_id, product_id: pid, katta: item.katta || 0, qtl: item.qtl || 0 };
          if (includeAmount) row.amount = item.amount || 0;
          rows.push(row);
        }
        await trx(tableName).insert(rows);
      }
    };

    const saveRepeating = async (tableName, dataArray, mapFn) => {
      await trx(tableName).where({ report_id }).delete();
      if (dataArray && dataArray.length > 0) {
        const rows = dataArray.map(item => ({ report_id, ...mapFn(item) }));
        await trx(tableName).insert(rows);
      }
    };

    await saveRepeatingProducts('dmr_finish_stock', finish_stock, false);
    await saveRepeatingProducts('dmr_sales_report', sales_report, true);
    await saveRepeatingProducts('dmr_sales_pending', sales_pending, true);
    await saveRepeatingProducts('dmr_todays_production', todays_production, false);

    await trx('dmr_salesman_sales').where({ report_id }).delete();
    if (salesman_sales && salesman_sales.length > 0) {
      const rows = [];
      for (const item of salesman_sales) {
        const smId = await resolveSalesmanId(item.salesman_name, item.salesman_id);
        const pid = await resolveProductId(item.product_name || item.name, item.product_id);
        rows.push({
          report_id,
          salesman_id: smId,
          product_id: pid,
          katta: item.katta || 0,
          qtl: item.qtl || 0,
          amount: item.amount || 0
        });
      }
      await trx('dmr_salesman_sales').insert(rows);
    }

    await saveRepeating('dmr_jute_bags', jute_bags, i => ({ bag_type_id: i.bag_type_id, opening: i.opening, received: i.received, used: i.used }));
    await saveRepeating('dmr_wheat_locations', wheat_locations, i => ({ location_id: i.location_id, stock: i.stock }));
    await saveRepeating('dmr_attendance', attendance, i => ({ department: i.department, total: i.total, present: i.present, absent: i.absent }));
    await saveRepeating('dmr_moisture', moisture, i => ({ item_name: i.item_name, maida_1: i.maida_1, maida_2: i.maida_2, average: i.average }));

    await trx('dmr_lab_report').where({ report_id }).delete();
    if (lab_report) {
      await trx('dmr_lab_report').insert({ report_id, ...lab_report });
    }

    if (isUpdate) {
      const ctx = {
        report_type: 'daily_mill_report',
        report_id,
        report_date,
        changed_by: req.user.id,
        changed_by_email: req.user.email,
      };
      const entries = [];

      diffScalarFields(entries, ctx, DAILY_FIELD_LABELS, report, parentData || {});
      diffScalarFields(entries, ctx, LAB_FIELD_LABELS, oldChild.lab_report, lab_report || {});

      diffRepeatingRows(entries, ctx, 'Finish Stock', oldChild.finish_stock, finish_stock, 'product_id', ['katta', 'qtl'], 'name');
      diffRepeatingRows(entries, ctx, 'Sales Report', oldChild.sales_report, sales_report, 'product_id', ['katta', 'qtl', 'amount'], 'name');
      diffRepeatingRows(entries, ctx, 'Pending Sauda', oldChild.sales_pending, sales_pending, 'product_id', ['katta', 'qtl', 'amount'], 'name');
      diffRepeatingRows(entries, ctx, "Today's Production", oldChild.todays_production, todays_production, 'product_id', ['katta', 'qtl'], 'name');
      diffRepeatingRows(entries, ctx, 'Salesman Sales', oldChild.salesman_sales, salesman_sales,
        r => `${r.salesman_id}-${r.product_id}`, ['katta', 'qtl', 'amount'],
        r => `${r.salesman_name || r.salesman_id} - ${r.product_name || r.product_id}`);
      diffRepeatingRows(entries, ctx, 'Attendance', oldChild.attendance, attendance, 'department', ['total', 'present', 'absent'], 'department');
      diffRepeatingRows(entries, ctx, 'Moisture', oldChild.moisture, moisture, 'item_name', ['maida_1', 'maida_2', 'average'], 'item_name');

      if (entries.length > 0) {
        await trx('audit_log').insert(entries);
      }
    }

    await trx.commit();
    res.json({ success: true, report_id });
  } catch (error) {
    await trx.rollback();
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Padtal Report by Date
router.get('/padtal/:date', async (req, res) => {
  try {
    const report = await db('padtal_reports').where({ report_date: req.params.date }).first();
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    const yield_detail = await db('padtal_yield_detail')
      .leftJoin('master_products', 'padtal_yield_detail.product_id', 'master_products.id')
      .where({ report_id: report.id })
      .select('padtal_yield_detail.*', 'master_products.name as product_name', 'master_products.name as name');
    const expenses = await db('padtal_expenses')
      .leftJoin('master_expenses', 'padtal_expenses.expense_id', 'master_expenses.id')
      .where({ report_id: report.id })
      .select('padtal_expenses.*', 'master_expenses.name as expense_name', 'master_expenses.name as name');

    res.json({
      ...report,
      yield_detail,
      expenses
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/padtal', async (req, res) => {
    const trx = await db.transaction();
    try {
      const { report_date, parentData, yield_detail, expenses } = req.body;

      if (!canEditDate(req.user, report_date)) {
        await trx.rollback();
        return res.status(403).json({ error: 'Mill Floor users can only create or edit today\'s report. Past dates are read-only.' });
      }

      let report = await trx('padtal_reports').where({ report_date }).first();
      let report_id;
      const isUpdate = !!report;

      let oldChild = null;
      if (isUpdate) {
        report_id = report.id;
        oldChild = {
          yield_detail: await trx('padtal_yield_detail').where({ report_id }),
          expenses: await trx('padtal_expenses').where({ report_id }),
        };
      }

      if (report) {
        await trx('padtal_reports').where({ id: report.id }).update(parentData);
        report_id = report.id;
      } else {
        const inserted = await trx('padtal_reports').insert({
          report_date,
          created_by: req.user.id,
          ...parentData
        }).returning('id');
        report_id = typeof inserted[0] === 'object' ? inserted[0].id : inserted[0];
      }

      const resolveProductId = async (name, existingId) => {
        if (existingId && Number(existingId) > 0) return Number(existingId);
        if (!name) return 1;
        const cleanName = String(name).trim();
        const existing = await trx('master_products').whereRaw('LOWER(name) = ?', [cleanName.toLowerCase()]).first();
        if (existing) return existing.id;
        const inserted = await trx('master_products').insert({ name: cleanName, is_active: 1 }).returning('id');
        return typeof inserted[0] === 'object' ? inserted[0].id : inserted[0];
      };

      const resolveExpenseId = async (name, existingId) => {
        if (existingId && Number(existingId) > 0) return Number(existingId);
        if (!name) return 1;
        const cleanName = String(name).trim();
        const existing = await trx('master_expenses').whereRaw('LOWER(name) = ?', [cleanName.toLowerCase()]).first();
        if (existing) return existing.id;
        const inserted = await trx('master_expenses').insert({ name: cleanName, is_active: 1 }).returning('id');
        return typeof inserted[0] === 'object' ? inserted[0].id : inserted[0];
      };

      await trx('padtal_yield_detail').where({ report_id }).delete();
      if (yield_detail && yield_detail.length > 0) {
        const rows = [];
        for (const item of yield_detail) {
          const pid = await resolveProductId(item.product_name || item.name, item.product_id);
          rows.push({
            report_id,
            product_id: pid,
            yield_percent: item.yield_percent || 0,
            rate_per_bag: item.rate_per_bag || 0,
            rate_per_kg: item.rate_per_kg || 0,
            avg_rate: item.avg_rate || 0
          });
        }
        await trx('padtal_yield_detail').insert(rows);
      }

      await trx('padtal_expenses').where({ report_id }).delete();
      if (expenses && expenses.length > 0) {
        const rows = [];
        for (const item of expenses) {
          const eid = await resolveExpenseId(item.expense_name || item.name, item.expense_id);
          rows.push({
            report_id,
            expense_id: eid,
            amount: item.amount || 0
          });
        }
        await trx('padtal_expenses').insert(rows);
      }

      if (isUpdate) {
        const ctx = {
          report_type: 'padtal_report',
          report_id,
          report_date,
          changed_by: req.user.id,
          changed_by_email: req.user.email,
        };
        const entries = [];

        diffScalarFields(entries, ctx, PADTAL_FIELD_LABELS, report, parentData || {});
        diffRepeatingRows(entries, ctx, 'Yield Detail', oldChild.yield_detail, yield_detail, 'product_id',
          ['yield_percent', 'rate_per_bag', 'rate_per_kg', 'avg_rate'], 'name');
        diffRepeatingRows(entries, ctx, 'Expenses', oldChild.expenses, expenses, 'expense_id', ['amount'], 'name');

        if (entries.length > 0) {
          await trx('audit_log').insert(entries);
        }
      }

      await trx.commit();
      res.json({ success: true, report_id });
    } catch (error) {
      await trx.rollback();
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

// Delete Daily Mill Report
router.delete('/daily/:date', async (req, res) => {
  const { date } = req.params;
  if (!canEditDate(req.user, date)) {
    return res.status(403).json({ error: "Mill Floor users can only delete today's report. Past dates are read-only." });
  }

  const trx = await db.transaction();
  try {
    const report = await trx('daily_mill_reports').where({ report_date: date }).first();
    if (!report) {
      await trx.rollback();
      return res.status(404).json({ error: 'No daily mill report found for this date.' });
    }

    const report_id = report.id;
    await trx('dmr_finish_stock').where({ report_id }).delete();
    await trx('dmr_sales_report').where({ report_id }).delete();
    await trx('dmr_sales_pending').where({ report_id }).delete();
    await trx('dmr_todays_production').where({ report_id }).delete();
    await trx('dmr_salesman_sales').where({ report_id }).delete();
    await trx('dmr_jute_bags').where({ report_id }).delete();
    await trx('dmr_wheat_locations').where({ report_id }).delete();
    await trx('dmr_attendance').where({ report_id }).delete();
    await trx('dmr_moisture').where({ report_id }).delete();
    await trx('dmr_lab_report').where({ report_id }).delete();
    await trx('daily_mill_reports').where({ id: report_id }).delete();

    await trx('audit_log').insert({
      report_type: 'daily_mill_report',
      report_id,
      report_date: date,
      changed_by: req.user.id,
      changed_by_email: req.user.email,
      field_name: 'Report Status',
      old_value: `Active Report (ID ${report_id})`,
      new_value: 'Deleted Report'
    });

    await trx.commit();
    res.json({ success: true, message: 'Daily Mill Report deleted successfully.' });
  } catch (error) {
    await trx.rollback();
    console.error('Error deleting daily report:', error);
    res.status(500).json({ error: 'Failed to delete daily mill report.' });
  }
});

// Delete Padtal Report
router.delete('/padtal/:date', async (req, res) => {
  const { date } = req.params;
  if (!canEditDate(req.user, date)) {
    return res.status(403).json({ error: "Users can only delete today's report. Past dates are read-only." });
  }

  const trx = await db.transaction();
  try {
    const report = await trx('padtal_reports').where({ report_date: date }).first();
    if (!report) {
      await trx.rollback();
      return res.status(404).json({ error: 'No padtal report found for this date.' });
    }

    const report_id = report.id;
    await trx('padtal_yield_detail').where({ report_id }).delete();
    await trx('padtal_expenses').where({ report_id }).delete();
    await trx('padtal_reports').where({ id: report_id }).delete();

    await trx('audit_log').insert({
      report_type: 'padtal_report',
      report_id,
      report_date: date,
      changed_by: req.user.id,
      changed_by_email: req.user.email,
      field_name: 'Report Status',
      old_value: `Active Report (ID ${report_id})`,
      new_value: 'Deleted Report'
    });

    await trx.commit();
    res.json({ success: true, message: 'Padtal Report deleted successfully.' });
  } catch (error) {
    await trx.rollback();
    console.error('Error deleting padtal report:', error);
    res.status(500).json({ error: 'Failed to delete padtal report.' });
  }
});

export default router;
