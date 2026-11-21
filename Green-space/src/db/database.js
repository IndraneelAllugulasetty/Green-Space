// src/db/database.js
// Database connection manager and query execution abstraction

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const config = require('../config');

class DatabaseManager {
  constructor(options = {}) {
    this.dbPath = options.path || config.database.sqlitePath;
    this.isMemory = this.dbPath === ':memory:';
    this.db = null;
  }

  connect() {
    if (this.db) {
      return this.db;
    }

    if (!this.isMemory) {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.db = new DatabaseSync(this.dbPath);

    // Concurrency and integrity pragmas
    this.db.exec('PRAGMA foreign_keys = ON;');
    if (!this.isMemory) {
      // WAL mode allows concurrent readers and safe single writer
      this.db.exec('PRAGMA journal_mode = WAL;');
      this.db.exec('PRAGMA synchronous = NORMAL;');
      this.db.exec('PRAGMA busy_timeout = 5000;');
    }

    return this.db;
  }

  getDb() {
    if (!this.db) {
      return this.connect();
    }
    return this.db;
  }

  // Transaction helper ensuring atomic commit or rollback
  transaction(fn) {
    const db = this.getDb();
    db.exec('BEGIN IMMEDIATE TRANSACTION;');
    try {
      const result = fn(db);
      db.exec('COMMIT;');
      return result;
    } catch (err) {
      try {
        db.exec('ROLLBACK;');
      } catch (rollbackErr) {
        // Rollback failed, could be already closed or aborted
      }
      throw err;
    }
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton for application runtime
const defaultDbManager = new DatabaseManager();

module.exports = {
  DatabaseManager,
  defaultDbManager,
  getDb: () => defaultDbManager.getDb(),
};
