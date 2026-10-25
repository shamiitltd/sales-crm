const { google } = require('googleapis');
const { Readable } = require('stream');
const xlsx = require('xlsx');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const cloudAuthDb = require('../db/cloudAuthDb');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const FOLDER_NAME = 'Sales CRM - SHAMIIT LLP';
const FILE_NAME = 'Sales_Pipeline_Master.xlsx';

// In-memory debouncing map: userId -> timeoutId
const debounceMap = new Map();

/**
 * Instantiate an OAuth2 client from environment configuration
 */
function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback';

  if (!clientId || !clientSecret) {
    return null;
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate user consent URL with offline access and force consent
 */
function generateAuthUrl(userId = null) {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) {
    throw new Error('Google OAuth2 credentials are not configured in server/.env (GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET)');
  }

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/drive.file'
    ],
    state: userId ? String(userId) : 'signup_login'
  });
}

/**
 * Exchange auth code for user tokens, fetch user profile, and UPSERT into Supabase PostgreSQL.
 * Directly executes the required UPSERT on the Supabase `users` table:
 * 
 * INSERT INTO users (name, email, password_hash, google_tokens, google_connected_email, updated_at)
 * VALUES ($1, $2, 'OAUTH_USER', $3, $4, NOW())
 * ON CONFLICT (email) 
 * DO UPDATE SET 
 *   google_tokens = EXCLUDED.google_tokens,
 *   google_connected_email = EXCLUDED.google_connected_email,
 *   updated_at = NOW()
 * RETURNING id, email, name, role;
 */
async function handleOAuthCallback(code, state = null) {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) {
    throw new Error('OAuth2 client not configured. Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.');
  }

  // 1. Exchange code for access & refresh tokens
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // 2. Retrieve user email & profile from Google OAuth2 API
  let googleEmail = null;
  let googleName = null;
  try {
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    googleEmail = userInfo.data.email ? userInfo.data.email.toLowerCase().trim() : null;
    googleName = userInfo.data.name || (googleEmail ? googleEmail.split('@')[0] : 'Sales User');
  } catch (e) {
    console.warn('[DriveService] Could not fetch Google userinfo profile:', e.message);
  }

  if (!googleEmail) {
    throw new Error('Unable to retrieve Google email address for authentication.');
  }

  // 3. Merge existing tokens to preserve refresh_token if Google omitted it on re-consent
  let existingTokens = {};
  try {
    const existingRow = await cloudAuthDb.getUserByEmail(googleEmail);
    if (existingRow && existingRow.google_tokens) {
      existingTokens = typeof existingRow.google_tokens === 'string'
        ? JSON.parse(existingRow.google_tokens)
        : existingRow.google_tokens;
    }
  } catch (e) {
    // Non-critical check
  }

  const mergedTokens = {
    ...existingTokens,
    ...tokens,
    refresh_token: tokens.refresh_token || existingTokens.refresh_token
  };

  const tokensJson = JSON.stringify(mergedTokens);

  // 4. Execute UPSERT on Supabase PostgreSQL users table
  const upsertSql = `
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

  let user;
  if (cloudAuthDb.isConfigured()) {
    const res = await cloudAuthDb.query(upsertSql, [
      googleName,
      googleEmail,
      tokensJson,
      googleEmail
    ]);
    user = res.rows[0];
    cloudAuthDb.syncShadowUserToLocal(user);
    console.log(`[DriveService] Supabase UPSERT successful: ${googleEmail} -> UUID ${user.id}`);
  } else {
    // Fallback if DATABASE_URL is not set
    user = await cloudAuthDb.upsertGoogleUser({
      name: googleName,
      email: googleEmail,
      tokens: mergedTokens
    });
  }

  const userId = user.id;

  // 5. Store returned Supabase UUID inside JWT session token
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role || 'sales_rep' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  // 6. Automatically provision folder and execute initial Excel sync immediately
  try {
    await syncLeadsToDrive(userId);
  } catch (syncErr) {
    console.error('[DriveService] Initial sync post-connection notice:', syncErr.message);
  }

  return { success: true, googleEmail, userId, token, user };
}

/**
 * Load google_tokens, drive_folder_id, and drive_sheet_file_id directly from Supabase
 * via `SELECT google_tokens, drive_folder_id, drive_sheet_file_id FROM users WHERE id = $1`
 */
async function getAuthenticatedClient(userId) {
  let user;
  if (cloudAuthDb.isConfigured()) {
    const res = await cloudAuthDb.query(
      'SELECT google_tokens, drive_folder_id, drive_sheet_file_id FROM users WHERE id::text = $1',
      [String(userId)]
    );
    user = res.rows[0] || null;
  } else {
    user = await cloudAuthDb.getUserTokensAndDrive(userId);
  }

  if (!user || !user.google_tokens) {
    return null;
  }

  let tokens;
  try {
    tokens = typeof user.google_tokens === 'string' ? JSON.parse(user.google_tokens) : user.google_tokens;
  } catch {
    return null;
  }

  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) return null;

  oauth2Client.setCredentials(tokens);

  // Listen to token refresh events and save updated access_token directly to Supabase
  oauth2Client.on('tokens', async (newTokens) => {
    try {
      let existingTokens = {};
      if (cloudAuthDb.isConfigured()) {
        const u = await cloudAuthDb.query('SELECT google_tokens FROM users WHERE id::text = $1', [String(userId)]);
        if (u.rows[0] && u.rows[0].google_tokens) {
          existingTokens = typeof u.rows[0].google_tokens === 'string'
            ? JSON.parse(u.rows[0].google_tokens)
            : u.rows[0].google_tokens;
        }
      }

      const merged = {
        ...existingTokens,
        ...newTokens,
        refresh_token: newTokens.refresh_token || existingTokens.refresh_token
      };

      if (cloudAuthDb.isConfigured()) {
        await cloudAuthDb.query(`
          UPDATE users
          SET google_tokens = $1::jsonb,
              updated_at = NOW()
          WHERE id::text = $2
        `, [JSON.stringify(merged), String(userId)]);
      } else {
        await cloudAuthDb.updateGoogleTokens(userId, { google_tokens: merged });
      }

      console.log(`[DriveService] Auto-refreshed tokens persisted directly to Supabase for user ${userId}`);
    } catch (err) {
      console.error('[DriveService] Remote token refresh save failed:', err.message);
    }
  });

  oauth2Client._userId = userId;
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  drive._userId = userId;
  return { oauth2Client, drive };
}

/**
 * Searches for folder in Drive root; creates it if missing.
 * Reads and updates drive_folder_id in Supabase using parameterized SQL queries.
 */
async function getOrCreateFolder(auth, folderName = FOLDER_NAME, userId = null) {
  const drive = auth && typeof auth.files?.list === 'function' ? auth : google.drive({ version: 'v3', auth });
  const targetUserId = userId || auth?._userId;

  // 1. Check cached folder ID from Supabase via SELECT
  if (targetUserId) {
    let driveFolderId = null;
    if (cloudAuthDb.isConfigured()) {
      const row = await cloudAuthDb.query('SELECT drive_folder_id FROM users WHERE id::text = $1', [String(targetUserId)]);
      driveFolderId = row.rows[0]?.drive_folder_id || null;
    } else {
      const u = await cloudAuthDb.getUserTokensAndDrive(targetUserId);
      driveFolderId = u?.drive_folder_id || null;
    }

    if (driveFolderId) {
      try {
        const existing = await drive.files.get({
          fileId: driveFolderId,
          fields: 'id, name, trashed'
        });
        if (existing.data && !existing.data.trashed) {
          return driveFolderId;
        }
      } catch (e) {
        console.log(`[DriveService] Cached folder ${driveFolderId} invalid, searching Drive.`);
      }
    }
  }

  // 2. Search if folder already exists in root by name
  const res = await drive.files.list({
    q: `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`,
    fields: 'files(id, name)',
    spaces: 'drive'
  });

  if (res.data.files && res.data.files.length > 0) {
    const folderId = res.data.files[0].id;
    if (targetUserId) {
      // Parameterized update of drive_folder_id in Supabase
      if (cloudAuthDb.isConfigured()) {
        await cloudAuthDb.query(`
          UPDATE users
          SET drive_folder_id = $1,
              updated_at = NOW()
          WHERE id::text = $2
        `, [folderId, String(targetUserId)]);
      } else {
        await cloudAuthDb.updateFolderId(targetUserId, folderId);
      }
    }
    return folderId;
  }

  // 3. Create folder if not found
  const created = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    },
    fields: 'id, name'
  });

  const folderId = created.data.id;
  if (targetUserId) {
    // Parameterized update of drive_folder_id in Supabase
    if (cloudAuthDb.isConfigured()) {
      await cloudAuthDb.query(`
        UPDATE users
        SET drive_folder_id = $1,
            updated_at = NOW()
        WHERE id::text = $2
      `, [folderId, String(targetUserId)]);
    } else {
      await cloudAuthDb.updateFolderId(targetUserId, folderId);
    }
  }
  console.log(`[DriveService] Auto-created Drive folder "${folderName}" (ID: ${folderId}) in Supabase`);
  return folderId;
}

/**
 * Build Multi-sheet Excel workbook from local SQLite data referencing user's Supabase UUID
 */
function buildPipelineWorkbook(userId) {
  const leads = db.prepare(`
    SELECT id, client_name, company, contact_number, email, source, stage, deal_value, priority, next_followup_date, notes, created_at, updated_at
    FROM leads
    WHERE user_id = ? AND deleted_at IS NULL
    ORDER BY id DESC
  `).all(String(userId));

  const activities = db.prepare(`
    SELECT a.id, l.client_name, l.company, a.type, a.description, a.created_at
    FROM activities a
    JOIN leads l ON a.lead_id = l.id
    WHERE a.user_id = ? AND l.deleted_at IS NULL
    ORDER BY a.created_at DESC
    LIMIT 200
  `).all(String(userId));

  // Sheet 1: Leads & Pipeline
  const leadsData = leads.map((r) => ({
    'Lead ID': r.id,
    'Client Name': r.client_name,
    'Company': r.company || 'N/A',
    'Stage': r.stage,
    'Deal Value (INR)': Number(r.deal_value || 0),
    'Priority': r.priority || 'Medium',
    'Source': r.source || 'Website',
    'Contact Number': r.contact_number || 'N/A',
    'Email Address': r.email || 'N/A',
    'Next Follow-up': r.next_followup_date || 'None',
    'Latest Notes': r.notes || '',
    'Created Date': r.created_at,
    'Last Updated': r.updated_at
  }));

  // Sheet 2: Interaction Timeline
  const activitiesData = activities.map((a) => ({
    'Activity ID': a.id,
    'Client Name': a.client_name,
    'Company': a.company || 'N/A',
    'Action Type': a.type,
    'Description / Log': a.description,
    'Timestamp': a.created_at
  }));

  // Sheet 3: Executive Summary
  const totalLeads = leads.length;
  const wonLeads = leads.filter((l) => l.stage === 'Closed Won').length;
  const totalValue = leads.reduce((acc, l) => acc + Number(l.deal_value || 0), 0);
  const winRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) + '%' : '0%';

  const summaryData = [
    { 'Metric': 'Product', 'Value': 'Sales CRM - a product of SHAMIIT LLP' },
    { 'Metric': 'Auto-Sync Timestamp', 'Value': new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) },
    { 'Metric': 'Total Active Leads', 'Value': totalLeads },
    { 'Metric': 'Deals Won', 'Value': wonLeads },
    { 'Metric': 'Win Rate', 'Value': winRate },
    { 'Metric': 'Total Pipeline Value', 'Value': `INR ${totalValue.toLocaleString('en-IN')}` }
  ];

  const wb = xlsx.utils.book_new();

  const wsLeads = xlsx.utils.json_to_sheet(leadsData);
  wsLeads['!cols'] = [
    { wch: 8 }, { wch: 26 }, { wch: 24 }, { wch: 18 }, { wch: 18 },
    { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 26 }, { wch: 14 },
    { wch: 40 }, { wch: 22 }, { wch: 22 }
  ];
  xlsx.utils.book_append_sheet(wb, wsLeads, 'Sales Pipeline');

  const wsActivities = xlsx.utils.json_to_sheet(activitiesData);
  wsActivities['!cols'] = [
    { wch: 10 }, { wch: 24 }, { wch: 24 }, { wch: 14 }, { wch: 50 }, { wch: 22 }
  ];
  xlsx.utils.book_append_sheet(wb, wsActivities, 'Activity History');

  const wsSummary = xlsx.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 26 }, { wch: 40 }];
  xlsx.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Exposes syncLeadsToDrive(userId):
 * Pulls leads from local SQLite, formats Excel, updates file on Google Drive,
 * and updates `drive_sheet_file_id` in Supabase using parameterized SQL queries.
 */
async function syncLeadsToDrive(userId) {
  const clientData = await getAuthenticatedClient(userId);
  if (!clientData) {
    return { success: false, reason: 'NOT_CONNECTED' };
  }

  const { drive, oauth2Client } = clientData;

  try {
    // 1. Proactively validate expiration & auto-refresh token if near expiry
    try {
      await oauth2Client.getAccessToken();
    } catch (tokenErr) {
      console.warn(`[DriveService] Token refresh check failed for user ${userId}:`, tokenErr.message);
      throw tokenErr;
    }

    const folderId = await getOrCreateFolder(drive, FOLDER_NAME, userId);
    const buffer = buildPipelineWorkbook(userId);

    // 2. Load drive_sheet_file_id directly from Supabase via SELECT
    let fileId = null;
    if (cloudAuthDb.isConfigured()) {
      const res = await cloudAuthDb.query('SELECT drive_sheet_file_id FROM users WHERE id::text = $1', [String(userId)]);
      fileId = res.rows[0]?.drive_sheet_file_id || null;
    } else {
      const u = await cloudAuthDb.getUserTokensAndDrive(userId);
      fileId = u?.drive_sheet_file_id || null;
    }

    // Verify existing file if recorded
    if (fileId) {
      try {
        const fileCheck = await drive.files.get({ fileId, fields: 'id, trashed' });
        if (fileCheck.data.trashed) fileId = null;
      } catch {
        fileId = null;
      }
    }

    // If no valid fileId, search inside folder by file name
    if (!fileId) {
      const searchRes = await drive.files.list({
        q: `'${folderId}' in parents and name = '${FILE_NAME}' and trashed = false`,
        fields: 'files(id, name)',
        spaces: 'drive'
      });
      if (searchRes.data.files && searchRes.data.files.length > 0) {
        fileId = searchRes.data.files[0].id;
      }
    }

    const mediaStream = new Readable();
    mediaStream.push(buffer);
    mediaStream.push(null);

    const media = {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: mediaStream
    };

    let result;
    const nowIso = new Date().toISOString();

    if (fileId) {
      // Overwrite / update existing spreadsheet
      result = await drive.files.update({
        fileId,
        media,
        fields: 'id, name, webViewLink, modifiedTime'
      });
      console.log(`[DriveService] Overwrote ${FILE_NAME} (ID: ${fileId}) for Supabase user ${userId}`);
    } else {
      // Create new file inside the dedicated folder
      result = await drive.files.create({
        requestBody: {
          name: FILE_NAME,
          parents: [folderId],
          description: 'Automated multi-sheet pipeline master workbook - SHAMIIT LLP Sales CRM'
        },
        media,
        fields: 'id, name, webViewLink, createdTime'
      });
      fileId = result.data.id;
      console.log(`[DriveService] Created ${FILE_NAME} (ID: ${fileId}) for Supabase user ${userId}`);
    }

    // 3. Update drive_sheet_file_id in Supabase using parameterized SQL query
    if (cloudAuthDb.isConfigured()) {
      await cloudAuthDb.query(`
        UPDATE users
        SET drive_sheet_file_id = $1,
            drive_last_synced_at = $2,
            updated_at = NOW()
        WHERE id::text = $3
      `, [fileId, nowIso, String(userId)]);
    } else {
      await cloudAuthDb.updateDriveFile(userId, {
        drive_sheet_file_id: fileId,
        drive_last_synced_at: nowIso
      });
    }

    return {
      success: true,
      fileId,
      fileName: FILE_NAME,
      lastSyncedAt: nowIso,
      webViewLink: result.data.webViewLink || null
    };
  } catch (err) {
    console.error(`[DriveService] Google Drive sync error for user ${userId}:`, err.message);

    const errMsg = String(err.message || '');
    const errCode = err.code || (err.response && err.response.status);

    if (
      errCode === 401 ||
      errMsg.includes('invalid_grant') ||
      errMsg.includes('Token has been expired or revoked') ||
      errMsg.includes('No access, refresh token')
    ) {
      console.warn(`[DriveService] Token revoked or invalid for user ${userId}. Resetting connection.`);
      await disconnectUserDrive(userId).catch(() => {});
      return {
        success: false,
        code: 'TOKEN_REVOKED',
        reason: 'TOKEN_EXPIRED',
        error: 'Google Drive session expired or authorization was revoked. Please reconnect Google Drive.'
      };
    }

    if (errMsg.includes('insufficient') || (errCode === 403 && errMsg.includes('scope'))) {
      return {
        success: false,
        code: 'INSUFFICIENT_SCOPE',
        reason: 'INSUFFICIENT_PERMISSIONS',
        error: 'Insufficient Google Drive permissions. Please reconnect and grant Drive file access.'
      };
    }

    if (errMsg.toLowerCase().includes('quota') || errMsg.includes('storageQuotaExceeded')) {
      return {
        success: false,
        code: 'QUOTA_EXCEEDED',
        reason: 'QUOTA_EXCEEDED',
        error: 'Google Drive storage quota exceeded. Please free up space in your Drive account.'
      };
    }

    if (errCode === 429 || errMsg.includes('rateLimitExceeded') || errMsg.includes('userRateLimitExceeded')) {
      return {
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        reason: 'RATE_LIMIT_EXCEEDED',
        error: 'Google Drive API rate limit reached. Synchronization will back off and retry automatically.'
      };
    }

    if (errCode === 'ETIMEDOUT' || errCode === 'ECONNRESET' || errCode === 'ENOTFOUND' || errCode === 'EAI_AGAIN' || errMsg.includes('fetch failed')) {
      return {
        success: false,
        code: 'NETWORK_OFFLINE',
        reason: 'NETWORK_TIMEOUT',
        error: 'Network connection to Google Drive is offline or timed out. Intent saved locally and will auto-sync on reconnect.'
      };
    }

    return { success: false, code: 'UNKNOWN_SYNC_ERROR', error: err.message || 'Google Drive sync failed.' };
  }
}

/**
 * 5-second debounced trigger for mutations
 */
function triggerDebouncedSync(userId) {
  if (debounceMap.has(userId)) {
    clearTimeout(debounceMap.get(userId));
  }

  const timeoutId = setTimeout(async () => {
    debounceMap.delete(userId);
    console.log(`[DriveService] Running debounced 5s auto-sync for user ${userId}...`);
    await syncLeadsToDrive(userId);
  }, 5000);

  debounceMap.set(userId, timeoutId);
}

/**
 * Retrieve current user Drive connection status directly from Supabase
 */
async function getUserDriveStatus(userId) {
  let user = null;
  if (cloudAuthDb.isConfigured()) {
    try {
      const res = await cloudAuthDb.query(
        'SELECT google_tokens, google_connected_email, drive_folder_id, drive_sheet_file_id, drive_last_synced_at FROM users WHERE id::text = $1',
        [String(userId)]
      );
      user = res.rows[0] || null;
    } catch (dbErr) {
      try {
        const resBasic = await cloudAuthDb.query(
          'SELECT google_tokens, google_connected_email, drive_folder_id, drive_sheet_file_id FROM users WHERE id::text = $1',
          [String(userId)]
        );
        user = resBasic.rows[0] || null;
      } catch (fallbackErr) {
        user = await cloudAuthDb.getUserById(userId);
      }
    }
  } else {
    user = await cloudAuthDb.getUserById(userId);
  }

  if (!user || !user.google_tokens) {
    return {
      isConnected: false,
      email: null,
      folderId: null,
      fileId: null,
      lastSyncedAt: null,
      isOAuthConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    };
  }

  try {
    const tokens = typeof user.google_tokens === 'string' ? JSON.parse(user.google_tokens) : user.google_tokens;
    const isConnected = Boolean(tokens && (tokens.access_token || tokens.refresh_token));
    return {
      isConnected,
      email: user.google_connected_email || tokens.googleEmail || null,
      folderId: user.drive_folder_id || null,
      fileId: user.drive_sheet_file_id || null,
      lastSyncedAt: user.drive_last_synced_at || null,
      isOAuthConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    };
  } catch {
    return {
      isConnected: false,
      email: null,
      folderId: null,
      fileId: null,
      lastSyncedAt: null,
      isOAuthConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    };
  }
}

/**
 * Disconnect Google Drive and revoke token in Supabase
 */
async function disconnectUserDrive(userId) {
  let user;
  if (cloudAuthDb.isConfigured()) {
    const res = await cloudAuthDb.query('SELECT google_tokens FROM users WHERE id::text = $1', [String(userId)]);
    user = res.rows[0] || null;
  } else {
    user = await cloudAuthDb.getUserById(userId);
  }

  if (user && user.google_tokens) {
    try {
      const tokens = typeof user.google_tokens === 'string' ? JSON.parse(user.google_tokens) : user.google_tokens;
      const oauth2Client = getOAuth2Client();
      if (oauth2Client && tokens.access_token) {
        await oauth2Client.revokeToken(tokens.access_token);
        console.log(`[DriveService] Revoked Google token for Supabase user ${userId}`);
      }
    } catch (e) {
      console.warn('[DriveService] Revocation warning (token may already be expired/revoked):', e.message);
    }
  }

  if (cloudAuthDb.isConfigured()) {
    await cloudAuthDb.query(`
      UPDATE users
      SET google_tokens = NULL,
          google_connected_email = NULL,
          drive_folder_id = NULL,
          drive_sheet_file_id = NULL,
          drive_last_synced_at = NULL,
          updated_at = NOW()
      WHERE id::text = $1
    `, [String(userId)]);
  } else {
    await cloudAuthDb.disconnectGoogle(userId);
  }

  return { success: true };
}

module.exports = {
  getOAuth2Client,
  generateAuthUrl,
  handleOAuthCallback,
  getOrCreateFolder,
  getOrCreateDriveFolder: getOrCreateFolder,
  syncLeadsToDrive,
  syncUserDriveData: syncLeadsToDrive,
  triggerDebouncedSync,
  getUserDriveStatus,
  disconnectUserDrive,
  buildPipelineWorkbook
};
