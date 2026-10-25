const { Pool } = require('pg');
const dbLocal = require('./database');

/**
 * Cloud PostgreSQL Authentication & Token Persistence Module
 * Connects to remote PostgreSQL (Neon, Supabase, Render, AWS RDS) via connection pooling.
 * Falls back safely to SQLite when DATABASE_URL is not yet configured.
 */

let pool = null;
let isConnected = false;

function getPool() {
  if (pool) return pool;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return null;
  }

  // Neon, Supabase, and cloud PostgreSQL require SSL
  const requiresSsl = !databaseUrl.includes('localhost') && !databaseUrl.includes('127.0.0.1');

  pool = new Pool({
    connectionString: databaseUrl,
    ssl: requiresSsl ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 8000,
  });

  pool.on('error', (err) => {
    console.error('[CloudAuthDb] Unexpected PostgreSQL pool error:', err.message);
  });

  return pool;
}

/**
 * Checks if remote PostgreSQL is configured
 */
function isConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Generic query executor
 */
async function query(text, params = []) {
  const activePool = getPool();
  if (!activePool) {
    throw new Error('DATABASE_URL is not configured in server/.env');
  }
  return await activePool.query(text, params);
}

/**
 * SQL Initialization Script Execution for PostgreSQL
 * Auto-creates the remote users table with native UUID and JSONB support if not existing.
 */
async function initCloudDb() {
  if (!isConfigured()) {
    console.log('[CloudAuthDb] Notice: DATABASE_URL not set in server/.env. Using local SQLite auth fallback.');
    return false;
  }

  try {
    const activePool = getPool();
    // Enable extensions for UUID support (gen_random_uuid is native in Postgres 13+)
    await activePool.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'sales_rep',
        google_tokens JSONB DEFAULT NULL,
        google_connected_email VARCHAR(255) DEFAULT NULL,
        drive_folder_id VARCHAR(255) DEFAULT NULL,
        drive_sheet_file_id VARCHAR(255) DEFAULT NULL,
        drive_last_synced_at TIMESTAMPTZ DEFAULT NULL,
        sync_version INTEGER DEFAULT 1,
        synced_version INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
      CREATE INDEX IF NOT EXISTS idx_users_google_email ON users (google_connected_email);
      CREATE INDEX IF NOT EXISTS idx_users_google_tokens ON users USING gin (google_tokens);

      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS drive_last_synced_at TIMESTAMPTZ DEFAULT NULL;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS sync_version INTEGER DEFAULT 1;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS synced_version INTEGER DEFAULT 0;
    `);

    isConnected = true;
    console.log('[CloudAuthDb] Connected to Remote PostgreSQL (Neon/Supabase) with UUID & JSONB support.');
    return true;
  } catch (err) {
    console.error('[CloudAuthDb] Initialization warning (falling back to local SQLite):', err.message);
    isConnected = false;
    return false;
  }
}

/**
 * Mirror shadow user in local SQLite database
 * Ensures foreign keys and local lead joins in SQLite recognize the user's remote UUID.
 */
function syncShadowUserToLocal(user) {
  if (!user || !user.id) return;
  try {
    const cleanEmail = user.email ? user.email.toLowerCase().trim() : '';

    // Check if an existing user row exists in SQLite with this email but different ID (e.g. legacy numeric ID)
    if (cleanEmail) {
      const existing = dbLocal.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(cleanEmail);
      if (existing && String(existing.id) !== String(user.id)) {
        // Migrate existing leads, activities, and tasks from legacy ID to the new Supabase UUID
        try {
          dbLocal.prepare('UPDATE leads SET user_id = ? WHERE user_id = ?').run(String(user.id), String(existing.id));
          dbLocal.prepare('UPDATE activities SET user_id = ? WHERE user_id = ?').run(String(user.id), String(existing.id));
          dbLocal.prepare('UPDATE tasks SET user_id = ? WHERE user_id = ?').run(String(user.id), String(existing.id));
          dbLocal.prepare('DELETE FROM users WHERE id = ?').run(String(existing.id));
          console.log(`[CloudAuthDb] Migrated SQLite leads from legacy ID ${existing.id} to Supabase UUID ${user.id}`);
        } catch (migErr) {
          console.warn('[CloudAuthDb] Legacy user migration notice:', migErr.message);
        }
      }
    }

    dbLocal.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, google_connected_email, drive_folder_id, drive_sheet_file_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        email = excluded.email,
        role = excluded.role,
        google_connected_email = excluded.google_connected_email,
        drive_folder_id = excluded.drive_folder_id,
        drive_sheet_file_id = excluded.drive_sheet_file_id
    `).run(
      String(user.id),
      user.name || '',
      cleanEmail,
      user.password_hash || '',
      user.role || 'sales_rep',
      user.google_connected_email || null,
      user.drive_folder_id || null,
      user.drive_sheet_file_id || null
    );
  } catch (e) {
    console.error('[CloudAuthDb] syncShadowUserToLocal error:', e.message);
  }
}

/**
 * Find user by email (case-insensitive)
 */
async function getUserByEmail(email) {
  const cleanEmail = email ? email.trim().toLowerCase() : '';
  if (!cleanEmail) return null;

  if (isConfigured()) {
    try {
      const res = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
      if (res.rows.length > 0) {
        const u = res.rows[0];
        syncShadowUserToLocal(u);
        return u;
      }
      return null;
    } catch (err) {
      console.warn('[CloudAuthDb] PostgreSQL query failed, falling back to local SQLite:', err.message);
    }
  }

  // SQLite fallback
  const local = dbLocal.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(cleanEmail);
  if (local && local.google_tokens && typeof local.google_tokens === 'string') {
    try { local.google_tokens = JSON.parse(local.google_tokens); } catch {}
  }
  return local || null;
}

/**
 * Find user by ID (UUID or numeric)
 */
async function getUserById(id) {
  if (!id) return null;

  if (isConfigured()) {
    try {
      const res = await query('SELECT * FROM users WHERE id::text = $1', [String(id)]);
      if (res.rows.length > 0) {
        const u = res.rows[0];
        syncShadowUserToLocal(u);
        return u;
      }
      return null;
    } catch (err) {
      console.warn('[CloudAuthDb] PostgreSQL query failed, falling back to local SQLite:', err.message);
    }
  }

  // SQLite fallback
  const local = dbLocal.prepare('SELECT * FROM users WHERE id = ?').get(String(id));
  if (local && local.google_tokens && typeof local.google_tokens === 'string') {
    try { local.google_tokens = JSON.parse(local.google_tokens); } catch {}
  }
  return local || null;
}

/**
 * Create a new user with native UUID in PostgreSQL
 */
async function createUser({ name, email, password_hash, role = 'sales_rep', google_tokens = null, google_connected_email = null }) {
  const cleanEmail = email.trim().toLowerCase();

  if (isConfigured()) {
    try {
      const res = await query(`
        INSERT INTO users (name, email, password_hash, role, google_tokens, google_connected_email)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        name.trim(),
        cleanEmail,
        password_hash,
        role,
        google_tokens ? JSON.stringify(google_tokens) : null,
        google_connected_email || null
      ]);

      const newUser = res.rows[0];
      syncShadowUserToLocal(newUser);
      return newUser;
    } catch (err) {
      console.warn('[CloudAuthDb] PostgreSQL insert failed, falling back to local SQLite:', err.message);
    }
  }

  // SQLite fallback
  const crypto = require('crypto');
  const uuid = crypto.randomUUID();
  dbLocal.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, google_tokens, google_connected_email)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    uuid,
    name.trim(),
    cleanEmail,
    password_hash,
    role,
    google_tokens ? JSON.stringify(google_tokens) : null,
    google_connected_email || null
  );

  return await getUserById(uuid);
}

/**
 * UPSERT user from Google OAuth into Supabase/PostgreSQL users table
 * Exactly matches requested schema and conflict resolution on email.
 */
async function upsertGoogleUser({ name, email, tokens }) {
  const cleanEmail = email ? email.trim().toLowerCase() : '';
  const tokensJson = tokens ? (typeof tokens === 'string' ? tokens : JSON.stringify(tokens)) : null;

  if (isConfigured()) {
    const sql = `
      INSERT INTO users (name, email, password_hash, google_tokens, google_connected_email, updated_at)
      VALUES ($1, $2, 'OAUTH_USER', $3, $4, NOW())
      ON CONFLICT (email) 
      DO UPDATE SET 
        name = COALESCE(EXCLUDED.name, users.name),
        google_tokens = EXCLUDED.google_tokens,
        google_connected_email = EXCLUDED.google_connected_email,
        updated_at = NOW()
      RETURNING id, email, name, role;
    `;

    const res = await query(sql, [name || 'Sales User', cleanEmail, tokensJson, cleanEmail]);
    const user = res.rows[0];
    syncShadowUserToLocal(user);
    console.log(`[CloudAuthDb] UPSERTED Google user in Supabase: ${cleanEmail} -> UUID ${user.id}`);
    return user;
  }

  // SQLite fallback
  const crypto = require('crypto');
  const existing = dbLocal.prepare('SELECT id, email, name, role FROM users WHERE LOWER(email) = LOWER(?)').get(cleanEmail);
  const userId = existing ? existing.id : crypto.randomUUID();

  dbLocal.prepare(`
    INSERT INTO users (id, name, email, password_hash, google_tokens, google_connected_email)
    VALUES (?, ?, ?, 'OAUTH_USER', ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      google_tokens = excluded.google_tokens,
      google_connected_email = excluded.google_connected_email
  `).run(userId, name || 'Sales User', cleanEmail, tokensJson, cleanEmail);

  return dbLocal.prepare('SELECT id, email, name, role FROM users WHERE LOWER(email) = LOWER(?)').get(cleanEmail);
}

/**
 * Load google_tokens, drive_folder_id, and drive_sheet_file_id directly from Supabase
 */
async function getUserTokensAndDrive(userId) {
  if (isConfigured()) {
    const sql = 'SELECT google_tokens, drive_folder_id, drive_sheet_file_id FROM users WHERE id::text = $1';
    const res = await query(sql, [String(userId)]);
    if (res.rows.length > 0) {
      const row = res.rows[0];
      if (row.google_tokens && typeof row.google_tokens === 'string') {
        try { row.google_tokens = JSON.parse(row.google_tokens); } catch {}
      }
      return row;
    }
    return null;
  }

  // SQLite fallback
  const row = dbLocal.prepare('SELECT google_tokens, drive_folder_id, drive_sheet_file_id FROM users WHERE id = ?').get(String(userId));
  if (row && row.google_tokens && typeof row.google_tokens === 'string') {
    try { row.google_tokens = JSON.parse(row.google_tokens); } catch {}
  }
  return row || null;
}

/**
 * Update Google OAuth tokens (JSONB) and connected email
 */
async function updateGoogleTokens(userId, { google_tokens, google_connected_email, drive_folder_id, drive_sheet_file_id, drive_last_synced_at }) {
  if (isConfigured()) {
    try {
      const tokensPayload = google_tokens ? (typeof google_tokens === 'string' ? google_tokens : JSON.stringify(google_tokens)) : null;
      const res = await query(`
        UPDATE users
        SET google_tokens = $1::jsonb,
            google_connected_email = COALESCE($2, google_connected_email),
            drive_folder_id = COALESCE($3, drive_folder_id),
            drive_sheet_file_id = COALESCE($4, drive_sheet_file_id),
            drive_last_synced_at = COALESCE($5, drive_last_synced_at),
            updated_at = CURRENT_TIMESTAMP
        WHERE id::text = $6
        RETURNING *
      `, [
        tokensPayload,
        google_connected_email || null,
        drive_folder_id || null,
        drive_sheet_file_id || null,
        drive_last_synced_at || null,
        String(userId)
      ]);

      if (res.rows.length > 0) {
        syncShadowUserToLocal(res.rows[0]);
        return res.rows[0];
      }
    } catch (err) {
      console.warn('[CloudAuthDb] PostgreSQL update tokens failed:', err.message);
    }
  }

  // SQLite fallback
  const tokensStr = google_tokens ? (typeof google_tokens === 'string' ? google_tokens : JSON.stringify(google_tokens)) : null;
  dbLocal.prepare(`
    UPDATE users
    SET google_tokens = ?,
        google_connected_email = COALESCE(?, google_connected_email),
        drive_folder_id = COALESCE(?, drive_folder_id),
        drive_sheet_file_id = COALESCE(?, drive_sheet_file_id),
        drive_last_synced_at = COALESCE(?, drive_last_synced_at)
    WHERE id = ?
  `).run(
    tokensStr,
    google_connected_email || null,
    drive_folder_id || null,
    drive_sheet_file_id || null,
    drive_last_synced_at || null,
    String(userId)
  );

  return await getUserById(userId);
}

/**
 * Update Drive Sheet File ID & Last Synced At
 */
async function updateDriveFile(userId, { drive_sheet_file_id, drive_last_synced_at }) {
  if (isConfigured()) {
    try {
      await query(`
        UPDATE users
        SET drive_sheet_file_id = $1,
            drive_last_synced_at = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id::text = $3
      `, [drive_sheet_file_id, drive_last_synced_at, String(userId)]);
    } catch (err) {
      console.warn('[CloudAuthDb] PostgreSQL updateDriveFile failed:', err.message);
    }
  }

  try {
    dbLocal.prepare('UPDATE users SET drive_sheet_file_id = ?, drive_last_synced_at = ? WHERE id = ?')
      .run(drive_sheet_file_id, drive_last_synced_at, String(userId));
  } catch {}
}

/**
 * Update Drive Folder ID
 */
async function updateFolderId(userId, folderId) {
  if (isConfigured()) {
    try {
      await query('UPDATE users SET drive_folder_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id::text = $2', [folderId, String(userId)]);
    } catch (err) {
      console.warn('[CloudAuthDb] PostgreSQL updateFolderId failed:', err.message);
    }
  }

  try {
    dbLocal.prepare('UPDATE users SET drive_folder_id = ? WHERE id = ?').run(folderId, String(userId));
  } catch {}
}

/**
 * Disconnect Google Drive
 */
async function disconnectGoogle(userId) {
  if (isConfigured()) {
    try {
      await query(`
        UPDATE users
        SET google_tokens = NULL,
            google_connected_email = NULL,
            drive_folder_id = NULL,
            drive_sheet_file_id = NULL,
            drive_last_synced_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id::text = $1
      `, [String(userId)]);
    } catch (err) {
      console.warn('[CloudAuthDb] PostgreSQL disconnectGoogle failed:', err.message);
    }
  }

  try {
    dbLocal.prepare(`
      UPDATE users
      SET google_tokens = NULL,
          google_connected_email = NULL,
          drive_folder_id = NULL,
          drive_sheet_file_id = NULL,
          drive_last_synced_at = NULL
      WHERE id = ?
    `).run(String(userId));
  } catch {}

  return { success: true };
}

/**
 * Increment sync_version
 */
async function incrementSyncVersion(userId) {
  if (isConfigured()) {
    try {
      await query('UPDATE users SET sync_version = COALESCE(sync_version, 0) + 1, updated_at = CURRENT_TIMESTAMP WHERE id::text = $1', [String(userId)]);
    } catch {}
  }

  try {
    dbLocal.prepare('UPDATE users SET sync_version = COALESCE(sync_version, 0) + 1 WHERE id = ?').run(String(userId));
  } catch {}
}

/**
 * Update synced_version
 */
async function updateSyncedVersion(userId, syncedVersion) {
  if (isConfigured()) {
    try {
      await query('UPDATE users SET synced_version = $1, updated_at = CURRENT_TIMESTAMP WHERE id::text = $2', [syncedVersion, String(userId)]);
    } catch {}
  }

  try {
    dbLocal.prepare('UPDATE users SET synced_version = ? WHERE id = ?').run(syncedVersion, String(userId));
  } catch {}
}

module.exports = {
  getPool,
  isConfigured,
  query,
  initCloudDb,
  getUserByEmail,
  getUserById,
  createUser,
  upsertGoogleUser,
  getUserTokensAndDrive,
  updateGoogleTokens,
  updateDriveFile,
  updateFolderId,
  disconnectGoogle,
  incrementSyncVersion,
  updateSyncedVersion,
  syncShadowUserToLocal
};
