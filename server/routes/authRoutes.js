const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const googleController = require('../controllers/googleController');
const jwt = require('jsonwebtoken');
const cloudAuthDb = require('../db/cloudAuthDb');
const { requireAuth, JWT_SECRET } = require('../middleware/authMiddleware');

async function optionalAuth(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await cloudAuthDb.getUserById(decoded.id);
      if (user) req.user = user;
    } catch {}
  }
  next();
}

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', requireAuth, authController.getMe);

// Google OAuth flow initiation (direct 1-click login/signup & Drive connect) and callback
router.get('/google', optionalAuth, googleController.initiateOAuth);
router.get('/google/callback', googleController.handleCallback);

module.exports = router;
