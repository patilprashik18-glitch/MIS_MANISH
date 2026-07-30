import knex from './db.js';

async function resetAll() {
  console.log('Clearing all report data...');
  await knex('dmr_finish_stock').del();
  await knex('dmr_sales_report').del();
  await knex('dmr_sales_pending').del();
  await knex('dmr_todays_production').del();
  await knex('dmr_salesman_sales').del();
  await knex('dmr_jute_bags').del();
  await knex('dmr_wheat_locations').del();
  await knex('dmr_attendance').del();
  await knex('daily_mill_reports').del();

  try { await knex('dmr_lab_report').del(); } catch(e) {}
  try { await knex('dmr_moisture').del(); } catch(e) {}
  try { await knex('padtal_yield_detail').del(); } catch(e) {}
  try { await knex('padtal_expenses').del(); } catch(e) {}
  try { await knex('padtal_reports').del(); } catch(e) {}
  try { await knex('audit_log').del(); } catch(e) {}

  console.log('Clearing all master data...');
  await knex('master_products').del();
  await knex('master_salesmen').del();
  await knex('master_expenses').del();
  await knex('master_locations').del();
  await knex('master_bag_types').del();

  console.log('Ensuring database schema is fully migrated...');
  await knex.migrate.latest();

  console.log('✅ All data cleared. Only admin user remains.');
  process.exit(0);
}

resetAll().catch(e => { console.error(e); process.exit(1); });
