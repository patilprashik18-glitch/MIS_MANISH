export async function up(knex) {
  await knex.schema.alterTable('daily_mill_reports', (table) => {
    table.decimal('wheat_purchase_rate', 10, 2).defaultTo(0);
  });
  await knex.schema.alterTable('padtal_reports', (table) => {
    table.decimal('difference_percent', 6, 2).defaultTo(0);
  });
}

export async function down(knex) {
  // SQLite alterTable column drops are complex - skipped in down per existing convention in this codebase
}
