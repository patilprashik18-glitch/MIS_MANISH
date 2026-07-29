import knex from 'knex';
import knexConfig from './knexfile.js';

const db = knex(knexConfig.development);

async function clearAllDataKeepUsers() {
  console.log('Starting data reset (preserving users)...');

  try {
    // 1. Clear all Daily Mill Report child tables
    const dmrChildren = [
      'dmr_lab_report',
      'dmr_moisture',
      'dmr_attendance',
      'dmr_wheat_locations',
      'dmr_jute_bags',
      'dmr_salesman_sales',
      'dmr_todays_production',
      'dmr_sales_pending',
      'dmr_sales_report',
      'dmr_finish_stock',
      'dmr_custom_sections'
    ];

    for (const table of dmrChildren) {
      try {
        await db(table).del();
        console.log(`Cleared table: ${table}`);
      } catch (err) {
        // Table might not exist or already clean
      }
    }

    // 2. Clear parent Daily Mill Reports
    try {
      await db('daily_mill_reports').del();
      console.log('Cleared table: daily_mill_reports');
    } catch (err) {}

    // 3. Clear Padtal Report tables
    try {
      await db('padtal_yield_detail').del();
      console.log('Cleared table: padtal_yield_detail');
    } catch (err) {}
    try {
      await db('padtal_expenses').del();
      console.log('Cleared table: padtal_expenses');
    } catch (err) {}
    try {
      await db('padtal_reports').del();
      console.log('Cleared table: padtal_reports');
    } catch (err) {}

    // 4. Clear Audit Logs
    try {
      await db('audit_logs').del();
      console.log('Cleared table: audit_logs');
    } catch (err) {}

    // 5. Clean & reset master tables to standard defaults
    await db('master_products').del();
    await db('master_salesmen').del();
    await db('master_expenses').del();

    await db('master_products').insert([
      { name: 'MAIDA BAKERY 50KG', is_active: 1 },
      { name: 'MAIDA 30KG', is_active: 1 },
      { name: 'MAIDA LEMINATION 50 KG', is_active: 1 },
      { name: 'REFINED WHEAT FLOUR (MAIDA) 50KG', is_active: 1 },
      { name: 'SOOJI 50 KG', is_active: 1 },
      { name: 'Sooji 30 Kgs', is_active: 1 },
      { name: 'Rawa 50 kg', is_active: 1 },
      { name: 'Rawa 30 Kg', is_active: 1 },
      { name: 'TANDORI MAIDA 50 KG', is_active: 1 },
      { name: 'CA50', is_active: 1 },
      { name: 'CA30', is_active: 1 },
      { name: 'FINE BRAN 40 KG', is_active: 1 },
      { name: 'Bran ROUGH 39 KG', is_active: 1 },
      { name: 'Bran Fine 49 KG', is_active: 1 },
      { name: 'DELUX BRAN 49KG', is_active: 1 },
      { name: 'SUPER DELUX BRAN 49KG', is_active: 1 },
      { name: 'POWER MESH 50 KG', is_active: 1 }
    ]);

    await db('master_salesmen').insert([
      { name: 'ADITYA JI', is_active: 1 },
      { name: 'KAILASH JI SHARMA', is_active: 1 },
      { name: 'DEEPAK JI SHARMA', is_active: 1 },
      { name: 'ADMIN', is_active: 1 }
    ]);

    await db('master_expenses').insert([
      { name: 'ELECTRIC BILL', is_active: 1 },
      { name: 'SALARY', is_active: 1 },
      { name: 'PP BAG', is_active: 1 },
      { name: 'CC INT..', is_active: 1 },
      { name: 'REPAIR & MAINTANANCE', is_active: 1 },
      { name: 'Staff Welfare A/c', is_active: 1 },
      { name: 'TRAVELLING EXPENSES', is_active: 1 },
      { name: 'PEST CONTROL', is_active: 1 },
      { name: 'DIRECTOR REMUNARATION', is_active: 1 },
      { name: 'Building Repaire & Maintance', is_active: 1 },
      { name: 'Printing & Stationery Exp', is_active: 1 },
      { name: 'Transport Exp. A/c', is_active: 1 },
      { name: 'Interest Paid (Expenses) BMW', is_active: 1 },
      { name: 'Wherehouse Rent', is_active: 1 },
      { name: 'Rent Pune', is_active: 1 },
      { name: 'Bardana Repaire', is_active: 1 },
      { name: 'MAIDA TRANSPORT', is_active: 1 },
      { name: 'Cash discount', is_active: 1 }
    ]);

    console.log('Master data reset to standard default items.');

    const userCount = await db('users').count('* as count').first();
    console.log(`Successfully preserved ${userCount.count} user account(s).`);
    console.log('ALL REPORT & AUDIT DATA CLEARED (USERS PRESERVED).');

  } catch (err) {
    console.error('Error during data reset:', err);
  } finally {
    await db.destroy();
  }
}

clearAllDataKeepUsers();
