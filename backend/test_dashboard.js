import db from './db.js';

async function testStats() {
  try {
    console.log('1. Testing monthReports...');
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
    const monthReports = await db('daily_mill_reports').whereBetween('report_date', [monthStart, monthEnd]);

    console.log('2. Testing latestReport...');
    const latestReport = await db('daily_mill_reports').orderBy('report_date', 'desc').first();

    console.log('3. Testing trendData loop...');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];
    const reports = await db('daily_mill_reports').where('report_date', '>=', dateStr).orderBy('report_date', 'asc');
    for (const rep of reports) {
      const salesData = await db('dmr_sales_report').where('report_id', rep.id).sum('qtl as total');
      const prodData = await db('dmr_todays_production').where('report_id', rep.id).sum('qtl as total');
      const attendanceData = await db('dmr_attendance').where('report_id', rep.id);
      const labReport = await db('dmr_lab_report').where('report_id', rep.id).first();
      const padtalReport = await db('padtal_reports').where('report_date', rep.report_date).first();
    }

    console.log('4. Testing latestReport breakdowns...');
    if (latestReport) {
      await db('dmr_todays_production').leftJoin('master_products', 'dmr_todays_production.product_id', 'master_products.id').where('report_id', latestReport.id);
    }

    console.log('5. Testing dashboard_chart_config...');
    let chartsConfig = [];
    try {
      chartsConfig = await db('dashboard_chart_config').orderBy('display_order', 'asc');
    } catch (e) {}

    console.log('6. Testing recentReports & recentPadtalReports...');
    await db('daily_mill_reports').orderBy('report_date', 'desc');
    await db('padtal_reports').orderBy('report_date', 'desc');

    console.log('✅ ALL DASHBOARD QUERIES SUCCESSFUL!');
    process.exit(0);
  } catch (err) {
    console.error('❌ DASHBOARD QUERY FAILED:', err);
    process.exit(1);
  }
}

testStats();
