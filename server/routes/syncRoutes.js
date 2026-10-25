const express = require('express');
const router = express.Router();
const googleController = require('../controllers/googleController');
const { requireAuth } = require('../middleware/authMiddleware');

// Protected Drive Sync routes
router.use(requireAuth);

router.get('/status', googleController.getStatus);
router.get('/drive/status', googleController.getStatus);

router.post('/sync', googleController.manualSync);
router.post('/drive/sync', googleController.manualSync);

router.post('/disconnect', googleController.disconnect);
router.post('/drive/disconnect', googleController.disconnect);

module.exports = router;
