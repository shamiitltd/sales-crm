const db = require('../db/database');
const syncQueueService = require('../services/syncQueueService');

exports.getTasks = (req, res) => {
  try {
    const userId = req.user.id;
    const { leadId } = req.query;

    let query = `
      SELECT t.*, l.client_name, l.company
      FROM tasks t
      LEFT JOIN leads l ON t.lead_id = l.id
      WHERE t.user_id = ? AND t.deleted_at IS NULL
    `;
    const params = [userId];

    if (leadId) {
      query += ' AND t.lead_id = ?';
      params.push(leadId);
    }

    query += ' ORDER BY t.is_completed ASC, t.due_date ASC, t.id DESC';

    const tasks = db.prepare(query).all(...params);
    res.json(tasks);
  } catch (err) {
    console.error('[TasksController] Error fetching tasks:', err);
    res.status(500).json({ error: 'Failed to retrieve task checklist.' });
  }
};

exports.createTask = (req, res) => {
  try {
    const userId = req.user.id;
    const { lead_id = null, title, due_date = '' } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required.' });
    }

    const stmt = db.prepare(`
      INSERT INTO tasks (user_id, lead_id, title, due_date, is_completed)
      VALUES (?, ?, ?, ?, 0)
    `);

    const result = stmt.run(userId, lead_id || null, title.trim(), due_date || null);
    const created = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);

    syncQueueService.notifyMutation(userId);

    res.status(201).json(created);
  } catch (err) {
    console.error('[TasksController] Error creating task:', err);
    res.status(500).json({ error: 'Failed to create task.' });
  }
};

exports.toggleTask = (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(id, userId);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const nextState = existing.is_completed ? 0 : 1;
    db.prepare('UPDATE tasks SET is_completed = ? WHERE id = ?').run(nextState, id);

    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    syncQueueService.notifyMutation(userId);

    res.json(updated);
  } catch (err) {
    console.error('[TasksController] Error toggling task:', err);
    res.status(500).json({ error: 'Failed to update task status.' });
  }
};

exports.deleteTask = (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    db.prepare('UPDATE tasks SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?').run(id, userId);
    syncQueueService.notifyMutation(userId);

    res.json({ success: true, id: Number(id) });
  } catch (err) {
    console.error('[TasksController] Error deleting task:', err);
    res.status(500).json({ error: 'Failed to delete task.' });
  }
};
