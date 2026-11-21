// src/db/migrate.js
// Runs database migrations

const fs = require('node:fs');
const path = require('node:path');
const { defaultDbManager } = require('./database');

function runMigrations(dbManager = defaultDbManager) {
  const db = dbManager.getDb();
  console.log('[MIGRATION] Applying database migrations...');

  const migrationFile = path.resolve(__dirname, 'migrations/001_sqlite_schema.sql');
  const sql = fs.readFileSync(migrationFile, 'utf8');

  db.exec(sql);
  console.log('[MIGRATION] Schema migration 001_sqlite_schema applied successfully.');
}

if (require.main === module) {
  try {
    runMigrations();
    process.exit(0);
  } catch (err) {
    console.error('[MIGRATION] Migration failed:', err);
    process.exit(1);
  }
}

module.exports = { runMigrations };
