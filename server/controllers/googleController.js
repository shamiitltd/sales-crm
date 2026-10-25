const {
  generateAuthUrl,
  handleOAuthCallback,
  syncLeadsToDrive,
  getUserDriveStatus,
  disconnectUserDrive
} = require('../services/driveService');

/**
 * GET /api/auth/google
 * Initiates the Google OAuth2 consent flow
 */
exports.initiateOAuth = (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const url = generateAuthUrl(userId);

    // If request asks for JSON (e.g. from frontend fetch), respond with JSON
    if (req.xhr || req.headers.accept?.includes('application/json') || req.query.json === 'true') {
      return res.json({ url });
    }

    // Otherwise redirect browser directly to Google consent screen
    res.redirect(url);
  } catch (err) {
    console.error('[GoogleController] Error generating OAuth URL:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Backwards-compatibility alias for GET /api/google/auth-url
 */
exports.getAuthUrl = (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const url = generateAuthUrl(userId);
    res.json({ url });
  } catch (err) {
    console.error('[GoogleController] Error generating OAuth URL:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/auth/google/callback (and aliases)
 * Handles Google OAuth2 code exchange, auto-registers/authenticates user, and redirects back to frontend
 */
exports.handleCallback = async (req, res) => {
  const clientOrigin = process.env.CLIENT_URL || process.env.CLIENT_ORIGIN || 'http://localhost:5174';

  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      console.warn('[GoogleController] OAuth denial from Google:', oauthError);
      return res.redirect(`${clientOrigin}/?drive_status=error&message=${encodeURIComponent(oauthError)}`);
    }

    if (!code) {
      return res.redirect(`${clientOrigin}/?drive_status=error&message=${encodeURIComponent('Missing authorization code from Google.')}`);
    }

    const result = await handleOAuthCallback(code, state);

    console.log(`[GoogleController] Direct Google Login & Drive sync successful for user ${result.userId} (${result.googleEmail})`);
    // Redirect to frontend with JWT auth token and drive_status=success
    res.redirect(`${clientOrigin}/?token=${encodeURIComponent(result.token)}&drive_status=success&google_sync=connected`);
  } catch (err) {
    console.error('[GoogleController] OAuth Callback processing error:', err.message);
    res.redirect(`${clientOrigin}/?drive_status=error&message=${encodeURIComponent(err.message)}`);
  }
};

const syncQueueService = require('../services/syncQueueService');

/**
 * GET /api/sync/drive/status and /api/sync/status
 * Returns connection state, email, folderId, and live queue state machine
 */
exports.getStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const status = await syncQueueService.getLiveStatus(userId);
    res.json(status);
  } catch (err) {
    console.error('[GoogleController] Error getting Drive status:', err);
    res.status(500).json({ error: 'Failed to retrieve Google Drive status.' });
  }
};

/**
 * POST /api/sync/drive/sync (and /api/sync/trigger)
 * Manually triggers an immediate Google Drive Excel export bypassing debounce
 */
exports.manualSync = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await syncQueueService.triggerImmediateSync(userId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    console.error('[GoogleController] Manual Drive sync error:', err);
    res.status(500).json({ error: err.message || 'Google Drive sync failed.' });
  }
};

/**
 * POST /api/sync/drive/disconnect (and /api/google/disconnect)
 * Revokes token and clears Google connection state in SQLite
 */
exports.disconnect = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await disconnectUserDrive(userId);
    res.json(result);
  } catch (err) {
    console.error('[GoogleController] Disconnect error:', err);
    res.status(500).json({ error: 'Failed to disconnect Google Drive.' });
  }
};
