const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let dbInstance;

// Universal SQLite adapter: tries better-sqlite3 first, falls back to native node:sqlite
try {
  const Database = require('better-sqlite3');
  const dbPath = path.resolve(__dirname, '..', 'crm.db');
  dbInstance = new Database(dbPath);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('synchronous = NORMAL');
  dbInstance.pragma('busy_timeout = 5000');
  dbInstance.pragma('foreign_keys = ON');
  console.log('[Database] Connected using better-sqlite3 (WAL mode, synchronous NORMAL)');
} catch (err) {
  try {
    const { DatabaseSync } = require('node:sqlite');
    const dbPath = path.resolve(__dirname, '..', 'crm.db');
    const rawDb = new DatabaseSync(dbPath);
    rawDb.exec('PRAGMA journal_mode = WAL;');
    rawDb.exec('PRAGMA synchronous = NORMAL;');
    rawDb.exec('PRAGMA busy_timeout = 5000;');
    rawDb.exec('PRAGMA foreign_keys = ON;');

    // Wrap in standard better-sqlite3-compatible interface with transaction support
    dbInstance = {
      exec: (sql) => rawDb.exec(sql),
      prepare: (sql) => {
        const stmt = rawDb.prepare(sql);
        return {
          run: (...params) => stmt.run(...params),
          get: (...params) => stmt.get(...params),
          all: (...params) => stmt.all(...params)
        };
      },
      pragma: (cmd) => rawDb.exec(`PRAGMA ${cmd};`),
      transaction: (fn) => {
        return (...args) => {
          rawDb.exec('BEGIN IMMEDIATE;');
          try {
            const result = fn(...args);
            rawDb.exec('COMMIT;');
            return result;
          } catch (txErr) {
            try { rawDb.exec('ROLLBACK;'); } catch (_) {}
            throw txErr;
          }
        };
      }
    };
    console.log('[Database] Connected using native node:sqlite (WAL mode, synchronous NORMAL)');
  } catch (nativeErr) {
    console.error('[Database] Failed to connect to SQLite:', err.message, nativeErr.message);
    throw nativeErr;
  }
}

// Initialize Tables
function initDatabase() {
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'sales_rep',
      google_tokens TEXT,
      google_connected_email TEXT,
      drive_folder_id TEXT,
      drive_sheet_file_id TEXT,
      drive_last_synced_at TEXT,
      sync_version INTEGER DEFAULT 1,
      synced_version INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      client_name TEXT NOT NULL,
      company TEXT,
      contact_number TEXT,
      email TEXT,
      source TEXT DEFAULT 'Website',
      stage TEXT NOT NULL DEFAULT 'New',
      deal_value REAL DEFAULT 0,
      priority TEXT DEFAULT 'Medium',
      next_followup_date TEXT,
      notes TEXT,
      deleted_at DATETIME DEFAULT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      lead_id INTEGER,
      title TEXT NOT NULL,
      due_date TEXT,
      is_completed INTEGER DEFAULT 0,
      deleted_at DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE SET NULL
    );
  `);

  // Migrate local users table id from INTEGER to TEXT if needed for remote UUID compatibility
  try {
    const usersInfo = dbInstance.prepare("PRAGMA table_info(users);").all();
    const idCol = usersInfo.find(c => c.name === 'id');
    if (idCol && idCol.type && idCol.type.toUpperCase() === 'INTEGER') {
      dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS users_v2 (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'sales_rep',
          google_tokens TEXT,
          google_connected_email TEXT,
          drive_folder_id TEXT,
          drive_sheet_file_id TEXT,
          drive_last_synced_at TEXT,
          sync_version INTEGER DEFAULT 1,
          synced_version INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT OR IGNORE INTO users_v2 
          SELECT CAST(id AS TEXT), name, email, password_hash, role, google_tokens, google_connected_email, drive_folder_id, drive_sheet_file_id, drive_last_synced_at, sync_version, synced_version, created_at 
          FROM users;
        DROP TABLE users;
        ALTER TABLE users_v2 RENAME TO users;
      `);
      console.log('[Database] Migrated local users table id to TEXT for remote UUID compatibility.');
    }
  } catch (migErr) {
    // Non-fatal if table is already migrated
  }

  // Safe migrations for users table columns
  const userColumns = [
    { name: 'google_tokens', type: 'TEXT' },
    { name: 'google_connected_email', type: 'TEXT' },
    { name: 'drive_folder_id', type: 'TEXT' },
    { name: 'drive_sheet_file_id', type: 'TEXT' },
    { name: 'drive_last_synced_at', type: 'TEXT' },
    { name: 'sync_version', type: 'INTEGER DEFAULT 1' },
    { name: 'synced_version', type: 'INTEGER DEFAULT 0' }
  ];
  for (const col of userColumns) {
    try {
      dbInstance.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type};`);
    } catch {
      // Column already exists
    }
  }

  // Safe migrations for soft-delete columns on leads & tasks
  try {
    dbInstance.exec('ALTER TABLE leads ADD COLUMN deleted_at DATETIME DEFAULT NULL;');
  } catch {}

  try {
    dbInstance.exec('ALTER TABLE tasks ADD COLUMN deleted_at DATETIME DEFAULT NULL;');
  } catch {}

  // Create indexes now that all columns are guaranteed to exist
  dbInstance.exec(`
    CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads (stage);
    CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads (priority);
    CREATE INDEX IF NOT EXISTS idx_leads_followup ON leads (next_followup_date);
    CREATE INDEX IF NOT EXISTS idx_leads_deleted ON leads (deleted_at);
    CREATE INDEX IF NOT EXISTS idx_leads_user_deleted ON leads (user_id, deleted_at);
    CREATE INDEX IF NOT EXISTS idx_activities_lead ON activities (lead_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks (user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_deleted ON tasks (deleted_at);
  `);

  // Ensure default Admin User exists: raghav@shamiit.com / admin123
  let adminUser = dbInstance.prepare('SELECT * FROM users WHERE email = ?').get('raghav@shamiit.com');
  if (!adminUser) {
    const crypto = require('crypto');
    const adminId = crypto.randomUUID ? crypto.randomUUID() : '1';
    const defaultHash = bcrypt.hashSync('admin123', 10);
    const insertAdmin = dbInstance.prepare(`
      INSERT INTO users (id, name, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertAdmin.run(adminId, 'Raghav | Admin', 'raghav@shamiit.com', defaultHash, 'admin');
    console.log('[Database] Created default admin user: raghav@shamiit.com / admin123');
  }
}

initDatabase();

module.exports = dbInstance;
