import db from './db.js';

console.log('Running latest Knex migrations...');
db.migrate.latest()
  .then(() => {
    console.log('Migrations completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error running migrations:', err);
    process.exit(1);
  });
