const db = require('../db/database');
const syncQueueService = require('../services/syncQueueService');

exports.getLeadActivities = (req, res) => {
  try {
    const userId = req.user.id;
    const { leadId } = req.params;

    const activities = db.prepare(`
      SELECT a.*, u.name as user_name
      FROM activities a
      JOIN users u ON a.user_id = u.id
      WHERE a.lead_id = ? AND a.user_id = ?
      ORDER BY a.created_at DESC
    `).all(leadId, userId);

    res.json(activities);
  } catch (err) {
    console.error('Error fetching activities:', err);
    res.status(500).json({ error: 'Failed to retrieve interaction timeline.' });
  }
};

exports.createActivity = (req, res) => {
  try {
    const userId = req.user.id;
    const { lead_id, type = 'Note', description } = req.body;

    if (!lead_id || !description || !description.trim()) {
      return res.status(400).json({ error: 'Lead ID and description are required.' });
    }

    const lead = db.prepare('SELECT id FROM leads WHERE id = ? AND user_id = ?').get(lead_id, userId);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found.' });
    }

    const stmt = db.prepare(`
      INSERT INTO activities (lead_id, user_id, type, description)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(lead_id, userId, type, description.trim());
    const created = db.prepare('SELECT * FROM activities WHERE id = ?').get(result.lastInsertRowid);

    // Update lead's updated_at timestamp
    db.prepare('UPDATE leads SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(lead_id);

    // Trigger queue sync
    syncQueueService.notifyMutation(userId);

    res.status(201).json(created);
  } catch (err) {
    console.error('Error logging activity:', err);
    res.status(500).json({ error: 'Failed to log activity.' });
  }
};
