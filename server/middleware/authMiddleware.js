const jwt = require('jsonwebtoken');
const cloudAuthDb = require('../db/cloudAuthDb');

const JWT_SECRET = process.env.JWT_SECRET || 'shamiit_crm_jwt_secret_2026';

async function requireAuth(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await cloudAuthDb.getUserById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token. Please log in again.' });
  }
}

module.exports = {
  requireAuth,
  JWT_SECRET
};
