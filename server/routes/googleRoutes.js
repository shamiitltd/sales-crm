const express = require('express');
const router = express.Router();
const googleController = require('../controllers/googleController');
const { requireAuth } = require('../middleware/authMiddleware');

// Public callback endpoint (Google redirects here)
router.get('/callback', googleController.handleCallback);

// Authenticated endpoints
router.get('/auth-url', requireAuth, googleController.getAuthUrl);
router.get('/status', requireAuth, googleController.getStatus);
router.post('/sync', requireAuth, googleController.manualSync);
router.post('/disconnect', requireAuth, googleController.disconnect);

module.exports = router;
