export async function up(knex) {
  const hasTable = await knex.schema.hasTable('padtal_reports');
  if (hasTable) {
    await knex.schema.alterTable('padtal_reports', (table) => {
      table.decimal('wheat_net_avg_rate', 10, 2).defaultTo(0);
      table.decimal('grinding_expense', 10, 2).defaultTo(250);
      table.decimal('moisture_adjustment', 10, 2).defaultTo(0);
      table.decimal('final_margin', 10, 2).defaultTo(0);
    });
  }
}

export async function down(knex) {
  // SQLite alterTable column drops are complex - skipped in down per existing convention
}
