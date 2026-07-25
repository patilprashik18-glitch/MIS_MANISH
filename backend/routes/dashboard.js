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

export default router;
