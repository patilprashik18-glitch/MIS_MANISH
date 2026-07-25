export async function up(knex) {
  await knex('settings').insert([
    { key: 'padtal_diff_min', value: '0', description: 'Minimum acceptable Padtal margin difference % - alert if below this' }
  ]);
}

export async function down(knex) {
  await knex('settings').where({ key: 'padtal_diff_min' }).del();
}
