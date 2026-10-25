const express = require('express');
const router = express.Router();
const leadsController = require('../controllers/leadsController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', leadsController.getLeads);
router.get('/stats', leadsController.getDashboardStats);
router.get('/trash', leadsController.getTrashLeads);
router.get('/export/excel', leadsController.exportExcel);
router.post('/', leadsController.createLead);
router.put('/:id/restore', leadsController.restoreLead);
router.put('/:id', leadsController.updateLead);
router.delete('/:id/permanent', leadsController.permanentDeleteLead);
router.delete('/:id', leadsController.deleteLead);

module.exports = router;
