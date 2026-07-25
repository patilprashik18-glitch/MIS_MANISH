import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/stats', async (req, res) => {
  try {
    // Get latest report for KPIs
    const latestReport = await db('daily_mill_reports').orderBy('report_date', 'desc').first();
    let kpis = {
      grinding: 0,
      power: 0,
      sales: 0,
      moisture: 0
    };

    if (latestReport) {
      kpis.grinding = Number(latestReport.mill_grinding) + Number(latestReport.chakki_grinding);
      kpis.power = Number(latestReport.power_units);
      kpis.moisture = Number(latestReport.moisture_average_percent);
      
      const sales = await db('dmr_sales_report')
        .where('report_id', latestReport.id)
        .sum('amount as total');
      kpis.sales = sales[0].total || 0;
    }

    // Get trend data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    const reports = await db('daily_mill_reports')
      .where('report_date', '>=', dateStr)
      .orderBy('report_date', 'asc');

    let trendData = [];
    for (const rep of reports) {
      const salesData = await db('dmr_sales_report').where('report_id', rep.id).sum('qtl as total');
      const prodData = await db('dmr_todays_production').where('report_id', rep.id).sum('qtl as total');

      trendData.push({
        date: rep.report_date,
        mill_grinding: Number(rep.mill_grinding),
        chakki_grinding: Number(rep.chakki_grinding),
        power_units: Number(rep.power_units),
        sales_qtl: Number(salesData[0].total || 0),
        prod_qtl: Number(prodData[0].total || 0)
      });
    }

    // Get recent 5 reports
    const recentReports = await db('daily_mill_reports')
      .orderBy('report_date', 'desc')
      .limit(5);

    res.json({
      kpis,
      trendData,
      recentReports
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Compare key metrics between two date ranges (Period A vs Period B)
router.get('/compare', async (req, res) => {
  try {
    const { startA, endA, startB, endB } = req.query;
    if (!startA || !endA || !startB || !endB) {
      return res.status(400).json({ error: 'startA, endA, startB, endB are all required' });
    }

    const computePeriod = async (start, end) => {
      const reports = await db('daily_mill_reports').whereBetween('report_date', [start, end]);
      const reportIds = reports.map(r => r.id);

      const total_grinding = reports.reduce((sum, r) => sum + Number(r.mill_grinding || 0) + Number(r.chakki_grinding || 0), 0);
      const total_purchase_value = reports.reduce((sum, r) => sum + Number(r.wheat_received || 0) * Number(r.wheat_purchase_rate || 0), 0);

      const moistureVals = reports.map(r => Number(r.moisture_average_percent || 0)).filter(v => v > 0);
      const avg_moisture = moistureVals.length > 0 ? moistureVals.reduce((a, b) => a + b, 0) / moistureVals.length : null;

      let total_sales_value = 0;
      let total_production_qty = 0;
      if (reportIds.length > 0) {
        const salesSum = await db('dmr_sales_report').whereIn('report_id', reportIds).sum('amount as total').first();
        total_sales_value = Number(salesSum.total || 0);
        const prodSum = await db('dmr_todays_production').whereIn('report_id', reportIds).sum('qtl as total').first();
        total_production_qty = Number(prodSum.total || 0);
      }

      const padtalReports = await db('padtal_reports').whereBetween('report_date', [start, end]);
      const padtalDiffs = padtalReports.map(p => Number(p.difference_percent || 0));
      const avg_padtal_diff = padtalDiffs.length > 0 ? padtalDiffs.reduce((a, b) => a + b, 0) / padtalDiffs.length : null;

      return {
        total_grinding,
        total_sales_value,
        total_purchase_value,
        avg_moisture,
        total_production_qty,
        avg_padtal_diff,
        report_count: reports.length,
        padtal_count: padtalReports.length,
      };
    };

    const periodA = await computePeriod(startA, endA);
    const periodB = await computePeriod(startB, endB);

    res.json({ periodA, periodB });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
