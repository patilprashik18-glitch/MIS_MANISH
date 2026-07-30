import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/stats', async (req, res) => {
  try {
    // Get current month boundaries for KPIs
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
    const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

    const monthReports = await db('daily_mill_reports')
      .whereBetween('report_date', [monthStart, monthEnd]);
    const monthReportIds = monthReports.map(r => r.id);

    let kpis = {
      grinding: 0,
      power: 0,
      sales: 0,
      moisture: 0,
      monthName,
      reportCount: monthReports.length
    };

    if (monthReports.length > 0) {
      kpis.grinding = monthReports.reduce((sum, r) => sum + Number(r.mill_grinding || 0) + Number(r.chakki_grinding || 0), 0);
      kpis.power = monthReports.reduce((sum, r) => sum + Number(r.power_units || 0), 0);

      const moistureVals = monthReports.map(r => Number(r.moisture_average_percent || 0)).filter(v => v > 0);
      kpis.moisture = moistureVals.length > 0
        ? Number((moistureVals.reduce((a, b) => a + b, 0) / moistureVals.length).toFixed(2))
        : 0;

      if (monthReportIds.length > 0) {
        const salesSum = await db('dmr_sales_report')
          .whereIn('report_id', monthReportIds)
          .sum('amount as total')
          .first();
        kpis.sales = Number(salesSum?.total || 0);
      }
    }

    // Keep latestReport reference for breakdowns below
    const latestReport = await db('daily_mill_reports').orderBy('report_date', 'desc').first();

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
      const attendanceData = await db('dmr_attendance').where('report_id', rep.id);
      const labReport = await db('dmr_lab_report').where('report_id', rep.id).first();
      const padtalReport = await db('padtal_reports').where('report_date', rep.report_date).first();

      let presentSum = 0;
      let absentSum = 0;
      attendanceData.forEach(a => {
        presentSum += Number(a.present || 0);
        absentSum += Number(a.absent || 0);
      });

      // Compute simple padtal net margin if available
      let padtalMargin = 0;
      if (padtalReport) {
        const yields = await db('padtal_yield_detail').where('report_id', padtalReport.id);
        const exps = await db('padtal_expenses').where('report_id', padtalReport.id);
        const realization = yields.reduce((sum, y) => sum + (Number(y.yield_percent) * Number(y.avg_rate)) / 100, 0);
        const expSum = exps.reduce((sum, e) => sum + Number(e.amount), 0);
        const netRealization = realization - expSum;
        const adjustedWheat = Number(padtalReport.wheat_rate) * 0.96;
        padtalMargin = Number((netRealization - adjustedWheat).toFixed(2));
      }

      trendData.push({
        date: rep.report_date,
        mill_grinding: Number(rep.mill_grinding),
        chakki_grinding: Number(rep.chakki_grinding),
        power_units: Number(rep.power_units),
        sales_qtl: Number(salesData[0].total || 0),
        prod_qtl: Number(prodData[0].total || 0),
        moisture_avg: Number(rep.moisture_average_percent || 0),
        wp: Number(labReport?.wp || 0),
        ash: Number(labReport?.ash || 0),
        gluten: Number(labReport?.gluten || 0),
        attendance_present: presentSum,
        attendance_absent: absentSum,
        padtal_margin: padtalMargin
      });
    }

    // Get breakdowns for the latest report
    let productProductionToday = [];
    let productSalesToday = [];
    let salesmanSalesToday = [];
    let attendanceToday = [];
    let labToday = null;

    if (latestReport) {
      const prodRows = await db('dmr_todays_production')
        .leftJoin('master_products', 'dmr_todays_production.product_id', 'master_products.id')
        .where('report_id', latestReport.id)
        .select('master_products.name as product_name', 'dmr_todays_production.qtl', 'dmr_todays_production.katta');
      productProductionToday = prodRows;

      const salesRows = await db('dmr_sales_report')
        .leftJoin('master_products', 'dmr_sales_report.product_id', 'master_products.id')
        .where('report_id', latestReport.id)
        .select('master_products.name as product_name', 'dmr_sales_report.qtl', 'dmr_sales_report.amount');
      productSalesToday = salesRows;

      const salesmanRows = await db('dmr_salesman_sales')
        .leftJoin('master_salesmen', 'dmr_salesman_sales.salesman_id', 'master_salesmen.id')
        .leftJoin('master_products', 'dmr_salesman_sales.product_id', 'master_products.id')
        .where('report_id', latestReport.id)
        .select('master_salesmen.name as salesman_name', 'master_products.name as product_name', 'dmr_salesman_sales.qtl', 'dmr_salesman_sales.amount');
      salesmanSalesToday = salesmanRows;

      attendanceToday = await db('dmr_attendance')
        .where('report_id', latestReport.id)
        .select('department', 'total', 'present', 'absent');

      labToday = await db('dmr_lab_report')
        .where('report_id', latestReport.id)
        .first();
    }

    // Get enabled charts config
    let chartsConfig = [];
    try {
      chartsConfig = await db('dashboard_chart_config').orderBy('display_order', 'asc');
    } catch (e) {
      // Table might not be migrated yet in dev
      chartsConfig = [];
    }

    // Get all reports
    const recentReports = await db('daily_mill_reports')
      .orderBy('report_date', 'desc');

    let recentPadtalReports = [];
    try {
      recentPadtalReports = await db('padtal_reports')
        .orderBy('report_date', 'desc');
    } catch (e) {
      recentPadtalReports = [];
    }

    res.json({
      kpis,
      trendData,
      productProductionToday,
      productSalesToday,
      salesmanSalesToday,
      attendanceToday,
      labToday,
      chartsConfig,
      recentReports,
      recentPadtalReports
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
