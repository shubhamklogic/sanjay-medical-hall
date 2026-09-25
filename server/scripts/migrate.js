const fs = require('fs');
const path = require('path');
const db = require('../src/db');

async function runMigration() {
  try {
    console.log('Running database migration for Users & Doctors schemas...');
    const sqlPath = path.join(__dirname, 'initDb.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    await db.query(sqlContent);
    console.log('Migration completed successfully: "users" and "doctors" tables are ready.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();