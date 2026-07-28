const attendanceDepts = [
  'ADMIN', 'GENERAL', 'MILL STAFF', 'SECURITY',
  'PACKING', 'LOADING', 'UNLOADING', 'BARDANA'
];

const moistureItems = [
  'MAIDA', 'PARLE', 'SOOJI', 'RAWA 50', 'TM50',
  'BD', 'BF', 'DELUX'
];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min, max, decimals = 2) {
  const str = (Math.random() * (max - min) + min).toFixed(decimals);
  return parseFloat(str);
}

export async function seed(knex) {
  console.log('Clearing existing report data...');
  // Clear all associated child tables to avoid duplicates
  await knex('dmr_lab_report').del();
  await knex('dmr_moisture').del();
  await knex('dmr_attendance').del();
  await knex('dmr_wheat_locations').del();
  await knex('dmr_jute_bags').del();
  await knex('dmr_salesman_sales').del();
  await knex('dmr_todays_production').del();
  await knex('dmr_sales_pending').del();
  await knex('dmr_sales_report').del();
  await knex('dmr_finish_stock').del();
  // Clear parent table
  await knex('daily_mill_reports').del();

  console.log('Fetching master data (products and salesmen)...');
  const products = await knex('master_products').select('*');
  const salesmen = await knex('master_salesmen').select('*');

  if (products.length === 0) {
    console.log('No master products found. Skipping report backfill.');
    return;
  }

  // Generate date range: Last 30 days up to today
  const daysToGenerate = 30;
  const today = new Date();
  const dates = [];
  for (let i = daysToGenerate - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  console.log(`Backfilling reports for ${dates.length} dates from ${dates[0]} to ${dates[dates.length - 1]}...`);

  for (const dateStr of dates) {
    // 1. Insert parent report
    const millGrinding = getRandomFloat(800, 950);
    const chakkiGrinding = getRandomFloat(40, 80);
    const [reportId] = await knex('daily_mill_reports').insert({
      report_date: dateStr,
      mill_grinding: millGrinding,
      chakki_grinding: chakkiGrinding,
      bran_fine: getRandomFloat(10, 25),
      bran_super_delux: getRandomFloat(5, 15),
      bran_delux: getRandomFloat(15, 30),
      bran_coarse: getRandomFloat(0, 5),
      bran_chakki: getRandomFloat(2, 8),
      bran_load: getRandomFloat(1, 4),
      bran_bhushi: getRandomFloat(0, 3),
      bran_calcium: getRandomFloat(0, 2),
      bran_kanki: getRandomFloat(1, 5),
      moisture_maida_percent: getRandomFloat(12.8, 13.5),
      moisture_average_percent: getRandomFloat(12.5, 13.8),
      moisture_wheat_percent: getRandomFloat(11.0, 12.5),
      stop_hours: getRandomFloat(0.5, 3.0),
      running_hours: getRandomFloat(21.0, 23.5),
      wheat_opening: getRandomFloat(1500, 2500),
      wheat_received: getRandomFloat(500, 1000),
      power_units: getRandomFloat(4200, 5100),
      power_rate_per_unit: 8.5
    }).returning('id');

    const id = typeof reportId === 'object' ? reportId.id : reportId;

    // 2. Insert child tables: dmr_finish_stock
    const finishStockRows = products.map((p) => ({
      report_id: id,
      product_id: p.id,
      katta: getRandomInt(10, 100),
      qtl: getRandomFloat(5, 50)
    }));
    await knex('dmr_finish_stock').insert(finishStockRows);

    // 3. Insert child tables: dmr_sales_report
    const salesReportRows = products.map((p) => ({
      report_id: id,
      product_id: p.id,
      katta: getRandomInt(20, 200),
      qtl: getRandomFloat(10, 100),
      amount: getRandomFloat(15000, 150000)
    }));
    await knex('dmr_sales_report').insert(salesReportRows);

    // 4. Insert child tables: dmr_sales_pending
    const salesPendingRows = products.slice(0, Math.min(5, products.length)).map((p) => ({
      report_id: id,
      product_id: p.id,
      katta: getRandomInt(5, 30),
      qtl: getRandomFloat(2.5, 15),
      amount: getRandomFloat(5000, 25000)
    }));
    await knex('dmr_sales_pending').insert(salesPendingRows);

    // 5. Insert child tables: dmr_todays_production
    const todaysProductionRows = products.map((p) => ({
      report_id: id,
      product_id: p.id,
      katta: getRandomInt(15, 150),
      qtl: getRandomFloat(7.5, 75)
    }));
    await knex('dmr_todays_production').insert(todaysProductionRows);

    // 6. Insert child tables: dmr_salesman_sales
    if (salesmen.length > 0) {
      const salesmanSalesRows = [];
      for (const sm of salesmen) {
        for (const p of products.slice(0, 3)) {
          salesmanSalesRows.push({
            report_id: id,
            salesman_id: sm.id,
            product_id: p.id,
            katta: getRandomInt(10, 50),
            qtl: getRandomFloat(5, 25),
            amount: getRandomFloat(10000, 50000)
          });
        }
      }
      await knex('dmr_salesman_sales').insert(salesmanSalesRows);
    }

    // 7. Insert child tables: dmr_attendance
    const attendanceRows = attendanceDepts.map((dept) => {
      const total = getRandomInt(8, 20);
      const absent = getRandomInt(0, 2);
      const present = total - absent;
      return {
        report_id: id,
        department: dept,
        total,
        present,
        absent
      };
    });
    await knex('dmr_attendance').insert(attendanceRows);

    // 8. Insert child tables: dmr_moisture
    const moistureRows = moistureItems.map((item) => {
      const m1 = getRandomFloat(12.0, 14.0);
      const m2 = getRandomFloat(12.0, 14.0);
      return {
        report_id: id,
        item_name: item,
        maida_1: m1,
        maida_2: m2,
        average: parseFloat(((m1 + m2) / 2).toFixed(2))
      };
    });
    await knex('dmr_moisture').insert(moistureRows);
  }

  console.log('Backfilling completed successfully! All parent and child tables populated.');
}
