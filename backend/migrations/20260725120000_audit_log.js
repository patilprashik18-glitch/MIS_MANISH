export async function up(knex) {
  await knex.schema.createTable('audit_log', (table) => {
    table.increments('id').primary();
    table.string('report_type').notNullable(); // 'daily_mill_report' | 'padtal_report'
    table.integer('report_id').unsigned().notNullable();
    table.date('report_date').notNullable(); // denormalized for easy filtering without a join
    table.string('field_name').notNullable();
    table.string('old_value');
    table.string('new_value');
    table.integer('changed_by').unsigned().references('id').inTable('users');
    table.string('changed_by_email'); // denormalized so history stays readable if the user is later removed
    table.timestamp('changed_at').defaultTo(knex.fn.now());

    table.index(['report_type', 'report_id']);
    table.index(['report_date']);
    table.index(['changed_by']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('audit_log');
}
