import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Get Daily Mill Report by Date
router.get('/daily/:date', async (req, res) => {
  try {
    const report = await db('daily_mill_reports').where({ report_date: req.params.date }).first();
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    const report_id = report.id;
    const fetchTable = async (table) => await db(table).where({ report_id });

    const finish_stock = await fetchTable('dmr_finish_stock');
    const sales_report = await fetchTable('dmr_sales_report');
    const sales_pending = await fetchTable('dmr_sales_pending');
    const todays_production = await fetchTable('dmr_todays_production');
    const salesman_sales = await fetchTable('dmr_salesman_sales');
    const jute_bags = await fetchTable('dmr_jute_bags');
    const wheat_locations = await fetchTable('dmr_wheat_locations');
    const attendance = await fetchTable('dmr_attendance');
    const moisture = await fetchTable('dmr_moisture');
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
    
    let report = await trx('daily_mill_reports').where({ report_date }).first();
    let report_id;

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

    const saveRepeating = async (tableName, dataArray, mapFn) => {
      await trx(tableName).where({ report_id }).delete();
      if (dataArray && dataArray.length > 0) {
        const rows = dataArray.map(item => ({ report_id, ...mapFn(item) }));
        await trx(tableName).insert(rows);
      }
    };

    await saveRepeating('dmr_finish_stock', finish_stock, i => ({ product_id: i.product_id, katta: i.katta, qtl: i.qtl }));
    await saveRepeating('dmr_sales_report', sales_report, i => ({ product_id: i.product_id, katta: i.katta, qtl: i.qtl, amount: i.amount }));
    await saveRepeating('dmr_sales_pending', sales_pending, i => ({ product_id: i.product_id, katta: i.katta, qtl: i.qtl, amount: i.amount }));
    await saveRepeating('dmr_todays_production', todays_production, i => ({ product_id: i.product_id, katta: i.katta, qtl: i.qtl }));
    await saveRepeating('dmr_salesman_sales', salesman_sales, i => ({ salesman_id: i.salesman_id, product_id: i.product_id, katta: i.katta, qtl: i.qtl, amount: i.amount }));
    await saveRepeating('dmr_jute_bags', jute_bags, i => ({ bag_type_id: i.bag_type_id, opening: i.opening, received: i.received, used: i.used }));
    await saveRepeating('dmr_wheat_locations', wheat_locations, i => ({ location_id: i.location_id, stock: i.stock }));
    await saveRepeating('dmr_attendance', attendance, i => ({ department: i.department, total: i.total, present: i.present, absent: i.absent }));
    await saveRepeating('dmr_moisture', moisture, i => ({ item_name: i.item_name, maida_1: i.maida_1, maida_2: i.maida_2, average: i.average }));

    await trx('dmr_lab_report').where({ report_id }).delete();
    if (lab_report) {
      await trx('dmr_lab_report').insert({ report_id, ...lab_report });
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

    const yield_detail = await db('padtal_yield_detail').where({ report_id: report.id });
    const expenses = await db('padtal_expenses').where({ report_id: report.id });
    
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
      
      let report = await trx('padtal_reports').where({ report_date }).first();
      let report_id;
  
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
  
      await trx('padtal_yield_detail').where({ report_id }).delete();
      if (yield_detail && yield_detail.length > 0) {
        const rows = yield_detail.map(item => ({ 
          report_id,
          product_id: item.product_id,
          yield_percent: item.yield_percent,
          rate_per_bag: item.rate_per_bag,
          rate_per_kg: item.rate_per_kg,
          avg_rate: item.avg_rate
        }));
        await trx('padtal_yield_detail').insert(rows);
      }

      await trx('padtal_expenses').where({ report_id }).delete();
      if (expenses && expenses.length > 0) {
        const rows = expenses.map(item => ({ 
          report_id,
          expense_id: item.expense_id,
          amount: item.amount
        }));
        await trx('padtal_expenses').insert(rows);
      }
  
      await trx.commit();
      res.json({ success: true, report_id });
    } catch (error) {
      await trx.rollback();
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

export default router;
