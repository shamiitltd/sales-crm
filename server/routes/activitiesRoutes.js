const express = require('express');
const router = express.Router();
const activitiesController = require('../controllers/activitiesController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/lead/:leadId', activitiesController.getLeadActivities);
router.post('/', activitiesController.createActivity);

module.exports = router;
