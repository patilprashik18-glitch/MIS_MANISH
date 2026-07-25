export async function up(knex) {
  // Add missing columns to salesman sales to track products
  await knex.schema.alterTable('dmr_salesman_sales', (table) => {
    table.integer('product_id').unsigned().references('id').inTable('master_products');
    table.decimal('qtl', 10, 2).defaultTo(0);
    table.decimal('katta', 10, 2).defaultTo(0);
  });

  // Create Moisture Table
  await knex.schema.createTable('dmr_moisture', (table) => {
    table.increments('id').primary();
    table.integer('report_id').unsigned().references('id').inTable('daily_mill_reports').onDelete('CASCADE');
    table.string('item_name').notNullable();
    table.decimal('maida_1', 5, 2).defaultTo(0);
    table.decimal('maida_2', 5, 2).defaultTo(0);
    table.decimal('average', 5, 2).defaultTo(0);
  });

  // Create Lab Report Table
  await knex.schema.createTable('dmr_lab_report', (table) => {
    table.increments('id').primary();
    table.integer('report_id').unsigned().unique().references('id').inTable('daily_mill_reports').onDelete('CASCADE');
    table.decimal('wp', 5, 2).defaultTo(0);
    table.decimal('ash', 5, 2).defaultTo(0);
    table.decimal('gluten', 5, 2).defaultTo(0);
    table.decimal('sedimentation', 10, 2).defaultTo(0);
    table.decimal('bread_height', 10, 2).defaultTo(0);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('dmr_lab_report');
  await knex.schema.dropTableIfExists('dmr_moisture');
  
  // SQLite alterTable drops are complex, usually we skip it for down scripts in dev
}
