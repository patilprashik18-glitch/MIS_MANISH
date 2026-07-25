export async function up(knex) {
  // Application Settings (for limits like moisture)
  await knex.schema.createTable('settings', (table) => {
    table.string('key').primary();
    table.string('value').notNullable();
    table.string('description');
  });

  // Insert default moisture limits
  await knex('settings').insert([
    { key: 'moisture_min', value: '12', description: 'Minimum normal moisture %' },
    { key: 'moisture_max', value: '14', description: 'Maximum normal moisture %' }
  ]);

  // We already have daily_mill_reports parent table from Stage 1.
  // Add columns to daily_mill_reports for single-value sections:
  await knex.schema.alterTable('daily_mill_reports', (table) => {
    table.decimal('mill_grinding', 10, 2).defaultTo(0);
    table.decimal('chakki_grinding', 10, 2).defaultTo(0);
    table.decimal('bran_fine', 10, 2).defaultTo(0);
    table.decimal('bran_super_delux', 10, 2).defaultTo(0);
    table.decimal('bran_delux', 10, 2).defaultTo(0);
    table.decimal('bran_coarse', 10, 2).defaultTo(0);
    table.decimal('bran_chakki', 10, 2).defaultTo(0);
    table.decimal('bran_load', 10, 2).defaultTo(0);
    table.decimal('bran_bhushi', 10, 2).defaultTo(0);
    table.decimal('bran_bhushi_2', 10, 2).defaultTo(0);
    table.decimal('bran_calcium', 10, 2).defaultTo(0);
    table.decimal('bran_kanki', 10, 2).defaultTo(0);
    table.decimal('moisture_maida_percent', 5, 2).defaultTo(0);
    table.decimal('moisture_average_percent', 5, 2).defaultTo(0);
    table.decimal('moisture_wheat_percent', 5, 2).defaultTo(0);
    table.decimal('stop_hours', 5, 2).defaultTo(0);
    table.decimal('running_hours', 5, 2).defaultTo(0);
    table.decimal('wheat_opening', 10, 2).defaultTo(0);
    table.decimal('wheat_received', 10, 2).defaultTo(0);
    table.decimal('power_units', 10, 2).defaultTo(0);
    table.decimal('power_rate_per_unit', 10, 2).defaultTo(0);
  });

  // Repeating Tables related to daily_mill_reports
  const createRepeatingTable = async (tableName, columnsCb) => {
    await knex.schema.createTable(tableName, (table) => {
      table.increments('id').primary();
      table.integer('report_id').unsigned().references('id').inTable('daily_mill_reports').onDelete('CASCADE');
      columnsCb(table);
    });
  };

  await createRepeatingTable('dmr_finish_stock', (table) => {
    table.integer('product_id').unsigned().references('id').inTable('master_products');
    table.decimal('katta', 10, 2).defaultTo(0);
    table.decimal('qtl', 10, 2).defaultTo(0);
  });

  await createRepeatingTable('dmr_sales_report', (table) => {
    table.integer('product_id').unsigned().references('id').inTable('master_products');
    table.decimal('katta', 10, 2).defaultTo(0);
    table.decimal('qtl', 10, 2).defaultTo(0);
    table.decimal('amount', 12, 2).defaultTo(0);
  });

  await createRepeatingTable('dmr_sales_pending', (table) => {
    table.integer('product_id').unsigned().references('id').inTable('master_products');
    table.decimal('katta', 10, 2).defaultTo(0);
    table.decimal('qtl', 10, 2).defaultTo(0);
    table.decimal('amount', 12, 2).defaultTo(0);
  });

  await createRepeatingTable('dmr_todays_production', (table) => {
    table.integer('product_id').unsigned().references('id').inTable('master_products');
    table.decimal('katta', 10, 2).defaultTo(0);
    table.decimal('qtl', 10, 2).defaultTo(0);
  });

  await createRepeatingTable('dmr_salesman_sales', (table) => {
    table.integer('salesman_id').unsigned().references('id').inTable('master_salesmen');
    table.decimal('amount', 12, 2).defaultTo(0);
  });

  await createRepeatingTable('dmr_jute_bags', (table) => {
    table.integer('bag_type_id').unsigned().references('id').inTable('master_bag_types');
    table.decimal('opening', 10, 2).defaultTo(0);
    table.decimal('received', 10, 2).defaultTo(0);
    table.decimal('used', 10, 2).defaultTo(0);
  });

  await createRepeatingTable('dmr_wheat_locations', (table) => {
    table.integer('location_id').unsigned().references('id').inTable('master_locations');
    table.decimal('stock', 10, 2).defaultTo(0);
  });

  await createRepeatingTable('dmr_attendance', (table) => {
    table.string('department').notNullable(); 
    table.integer('total').defaultTo(0);
    table.integer('present').defaultTo(0);
    table.integer('absent').defaultTo(0);
  });

  // Padtal Report
  await knex.schema.createTable('padtal_reports', (table) => {
    table.increments('id').primary();
    table.date('report_date').unique().notNullable();
    table.string('wheat_lot_reference');
    table.decimal('wheat_rate', 10, 2).defaultTo(0);
    table.string('notes', 1000);
    table.integer('created_by').unsigned().references('id').inTable('users');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('padtal_yield_detail', (table) => {
    table.increments('id').primary();
    table.integer('report_id').unsigned().references('id').inTable('padtal_reports').onDelete('CASCADE');
    table.integer('product_id').unsigned().references('id').inTable('master_products');
    table.decimal('yield_percent', 5, 2).defaultTo(0);
    table.decimal('rate_per_bag', 10, 2).defaultTo(0);
    table.decimal('rate_per_kg', 10, 2).defaultTo(0);
    table.decimal('avg_rate', 10, 2).defaultTo(0);
  });

  await knex.schema.createTable('padtal_expenses', (table) => {
    table.increments('id').primary();
    table.integer('report_id').unsigned().references('id').inTable('padtal_reports').onDelete('CASCADE');
    table.integer('expense_id').unsigned().references('id').inTable('master_expenses');
    table.decimal('amount', 12, 2).defaultTo(0);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('padtal_expenses');
  await knex.schema.dropTableIfExists('padtal_yield_detail');
  await knex.schema.dropTableIfExists('padtal_reports');
  
  await knex.schema.dropTableIfExists('dmr_attendance');
  await knex.schema.dropTableIfExists('dmr_wheat_locations');
  await knex.schema.dropTableIfExists('dmr_jute_bags');
  await knex.schema.dropTableIfExists('dmr_salesman_sales');
  await knex.schema.dropTableIfExists('dmr_todays_production');
  await knex.schema.dropTableIfExists('dmr_sales_pending');
  await knex.schema.dropTableIfExists('dmr_sales_report');
  await knex.schema.dropTableIfExists('dmr_finish_stock');
  
  // Note: we can't easily drop columns added via alterTable without listing them all, 
  // but usually in down migrations we just leave them or write explicit drops.
  // We will drop the settings table.
  await knex.schema.dropTableIfExists('settings');
}
