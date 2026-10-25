const express = require('express');
const router = express.Router();
const tasksController = require('../controllers/tasksController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', tasksController.getTasks);
router.post('/', tasksController.createTask);
router.put('/:id/toggle', tasksController.toggleTask);
router.delete('/:id', tasksController.deleteTask);

module.exports = router;
