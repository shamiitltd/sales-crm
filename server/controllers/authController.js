const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cloudAuthDb = require('../db/cloudAuthDb');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const { getUserDriveStatus } = require('../services/driveService');

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || 'sales_rep',
    google_connected_email: user.google_connected_email || null,
    drive_folder_id: user.drive_folder_id || null,
    drive_sheet_file_id: user.drive_sheet_file_id || null,
    drive_last_synced_at: user.drive_last_synced_at || null,
    sync_version: user.sync_version || 1,
    synced_version: user.synced_version || 0,
    created_at: user.created_at
  };
}

/**
 * Register new user in Remote PostgreSQL Database (with UUID & JSONB)
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please provide name, email, and password.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await cloudAuthDb.getUserByEmail(cleanEmail);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const user = await cloudAuthDb.createUser({
      name: name.trim(),
      email: cleanEmail,
      password_hash: hash,
      role: 'sales_rep'
    });

    const token = generateToken(user);
    const googleDrive = await getUserDriveStatus(user.id);

    res.status(201).json({
      token,
      user: sanitizeUser(user),
      googleDrive
    });
  } catch (err) {
    console.error('[AuthController] Registration error:', err);
    res.status(500).json({ error: 'Failed to register account.' });
  }
};

/**
 * Authenticate user against Remote PostgreSQL Database
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await cloudAuthDb.getUserByEmail(cleanEmail);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user);
    const googleDrive = await getUserDriveStatus(user.id);

    res.json({
      token,
      user: sanitizeUser(user),
      googleDrive
    });
  } catch (err) {
    console.error('[AuthController] Login error:', err);
    res.status(500).json({ error: 'Authentication failed.' });
  }
};

/**
 * Fetch profile of currently authenticated user from Remote Database
 */
exports.getMe = async (req, res) => {
  try {
    const user = await cloudAuthDb.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    let googleDrive = {
      isConnected: false,
      email: null,
      folderId: null,
      fileId: null,
      lastSyncedAt: null,
      isOAuthConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    };

    try {
      googleDrive = await getUserDriveStatus(user.id);
    } catch (driveErr) {
      console.warn('[AuthController] Drive status check warning:', driveErr.message);
    }

    res.json({
      user: sanitizeUser(user),
      googleDrive
    });
  } catch (err) {
    console.error('[AuthController] Get profile error:', err);
    res.status(500).json({ error: 'Failed to retrieve user profile.' });
  }
};
