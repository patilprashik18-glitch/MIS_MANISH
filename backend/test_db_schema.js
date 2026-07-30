import knex from './db.js';

async function inspectTable() {
  try {
    const cols = await knex('padtal_reports').columnInfo();
    console.log('PADTAL_REPORTS COLUMNS:', Object.keys(cols));

    console.log('Running migrations explicitly...');
    await knex.migrate.latest();
    const colsAfter = await knex('padtal_reports').columnInfo();
    console.log('PADTAL_REPORTS COLUMNS AFTER MIGRATE:', Object.keys(colsAfter));
  } catch (err) {
    console.error('MIGRATION/SCHEMA ERROR:', err.message);
  } finally {
    process.exit(0);
  }
}

inspectTable();
