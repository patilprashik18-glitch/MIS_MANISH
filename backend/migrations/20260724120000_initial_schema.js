export async function up(knex) {
  // Users Table
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('email').unique().notNullable();
    table.string('password_hash').notNullable();
    table.enum('role', ['admin', 'mill_floor']).defaultTo('mill_floor');
    table.timestamps(true, true);
  });

  // Master Data: Products
  await knex.schema.createTable('master_products', (table) => {
    table.increments('id').primary();
    table.string('name').unique().notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // Master Data: Salesmen
  await knex.schema.createTable('master_salesmen', (table) => {
    table.increments('id').primary();
    table.string('name').unique().notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // Master Data: Expense Heads
  await knex.schema.createTable('master_expenses', (table) => {
    table.increments('id').primary();
    table.string('name').unique().notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // Master Data: Locations
  await knex.schema.createTable('master_locations', (table) => {
    table.increments('id').primary();
    table.string('name').unique().notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // Master Data: Jute Bags
  await knex.schema.createTable('master_bag_types', (table) => {
    table.increments('id').primary();
    table.string('name').unique().notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // Daily Mill Report (Parent Table)
  await knex.schema.createTable('daily_mill_reports', (table) => {
    table.increments('id').primary();
    table.date('report_date').unique().notNullable();
    table.integer('created_by').unsigned().references('id').inTable('users');
    table.timestamps(true, true);
  });

  // We'll define specific tables for repeating groups (Finish Stock, Sales, etc.) later
  // based on the daily_mill_reports id.
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('daily_mill_reports');
  await knex.schema.dropTableIfExists('master_bag_types');
  await knex.schema.dropTableIfExists('master_locations');
  await knex.schema.dropTableIfExists('master_expenses');
  await knex.schema.dropTableIfExists('master_salesmen');
  await knex.schema.dropTableIfExists('master_products');
  await knex.schema.dropTableIfExists('users');
}
