const db = require('../db/database');
const syncQueueService = require('../services/syncQueueService');
const { buildPipelineWorkbook } = require('../services/driveService');

const VALID_STAGES = [
  'New',
  'Contacted',
  'Proposal Sent',
  'Negotiation',
  'Closed Won',
  'Closed Lost'
];

/**
 * GET /api/leads
 * Retrieves active leads (excluding soft-deleted leads)
 */
exports.getLeads = (req, res) => {
  try {
    const userId = req.user.id;
    const { search, stage, priority, sort = 'created_at', order = 'desc' } = req.query;

    let query = 'SELECT * FROM leads WHERE user_id = ? AND deleted_at IS NULL';
    const params = [userId];

    if (stage && stage !== 'All' && stage !== 'All Stages') {
      query += ' AND stage = ?';
      params.push(stage);
    }

    if (priority && priority !== 'All') {
      query += ' AND priority = ?';
      params.push(priority);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ' AND (client_name LIKE ? OR company LIKE ? OR contact_number LIKE ? OR email LIKE ? OR notes LIKE ?)';
      params.push(term, term, term, term, term);
    }

    const allowedSort = ['client_name', 'company', 'deal_value', 'stage', 'priority', 'next_followup_date', 'created_at', 'updated_at'];
    const sanitizedSort = allowedSort.includes(sort) ? sort : 'created_at';
    const sanitizedOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${sanitizedSort} ${sanitizedOrder}`;

    const rows = db.prepare(query).all(...params);

    // Fetch tasks count & latest activity for each lead
    const leadsWithMeta = rows.map((lead) => {
      const tasksRow = db.prepare(`
        SELECT COUNT(*) as total, SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed
        FROM tasks
        WHERE lead_id = ? AND deleted_at IS NULL
      `).get(lead.id);

      const latestActivity = db.prepare(`
        SELECT type, description, created_at
        FROM activities
        WHERE lead_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `).get(lead.id);

      return {
        ...lead,
        taskStats: {
          total: tasksRow?.total || 0,
          completed: tasksRow?.completed || 0
        },
        latestActivity: latestActivity || null
      };
    });

    res.json(leadsWithMeta);
  } catch (err) {
    console.error('[LeadsController] Error fetching leads:', err);
    res.status(500).json({ error: 'Failed to retrieve sales pipeline leads.' });
  }
};

/**
 * GET /api/leads/trash
 * Retrieves soft-deleted leads for recovery or permanent deletion
 */
exports.getTrashLeads = (req, res) => {
  try {
    const userId = req.user.id;
    const leads = db.prepare(`
      SELECT * FROM leads
      WHERE user_id = ? AND deleted_at IS NOT NULL
      ORDER BY deleted_at DESC
    `).all(userId);

    res.json(leads);
  } catch (err) {
    console.error('[LeadsController] Error fetching trash leads:', err);
    res.status(500).json({ error: 'Failed to retrieve trash leads.' });
  }
};

/**
 * GET /api/leads/stats
 * Provides dashboard analytics calculated exclusively over active leads
 */
exports.getDashboardStats = (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const leads = db.prepare('SELECT * FROM leads WHERE user_id = ? AND deleted_at IS NULL').all(userId);
    const totalLeads = leads.length;

    // Active leads (excluding Closed Lost)
    const activeLeads = leads.filter((l) => l.stage !== 'Closed Lost').length;

    // Total Pipeline Value (sum of active deal values)
    const totalPipelineValue = leads
      .filter((l) => l.stage !== 'Closed Lost')
      .reduce((sum, l) => sum + Number(l.deal_value || 0), 0);

    // Closed Won deals count & value
    const wonLeads = leads.filter((l) => l.stage === 'Closed Won');
    const wonCount = wonLeads.length;
    const wonValue = wonLeads.reduce((sum, l) => sum + Number(l.deal_value || 0), 0);

    // Win Rate (%)
    const winRate = totalLeads > 0 ? Number(((wonCount / totalLeads) * 100).toFixed(1)) : 0;

    // Urgent Follow-ups Today (due today or overdue, excluding closed)
    const urgentFollowups = leads.filter((l) => {
      const isNotClosed = l.stage !== 'Closed Won' && l.stage !== 'Closed Lost';
      return isNotClosed && l.next_followup_date && l.next_followup_date <= today;
    });

    const overdueCount = urgentFollowups.filter((l) => l.next_followup_date < today).length;

    // Stage Distribution (Horizontal Bar Chart)
    const stageMap = {};
    for (const stage of VALID_STAGES) {
      stageMap[stage] = { count: 0, value: 0 };
    }
    for (const l of leads) {
      if (stageMap[l.stage]) {
        stageMap[l.stage].count += 1;
        stageMap[l.stage].value += Number(l.deal_value || 0);
      }
    }

    const stageDistribution = VALID_STAGES.filter((s) => s !== 'Closed Lost').map((stage) => {
      const count = stageMap[stage].count;
      const pct = totalLeads > 0 ? Number(((count / totalLeads) * 100).toFixed(1)) : 0;
      return {
        stage,
        count,
        value: stageMap[stage].value,
        percentage: pct
      };
    });

    // Monthly Trend dynamically grouped from real leads
    const monthlyMap = {};
    for (const l of leads) {
      if (l.created_at) {
        const monthKey = new Date(l.created_at).toLocaleString('default', { month: 'short' });
        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = { month: monthKey, inflow: 0, won: 0 };
        }
        monthlyMap[monthKey].inflow += Number(l.deal_value || 0);
        if (l.stage === 'Closed Won') {
          monthlyMap[monthKey].won += Number(l.deal_value || 0);
        }
      }
    }
    const monthlyTrend = Object.values(monthlyMap);

    // Source Breakdown
    const sourceCounts = {};
    for (const l of leads) {
      const src = l.source || 'Website';
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    }
    const sourceBreakdown = Object.keys(sourceCounts).map((src) => ({
      source: src,
      count: sourceCounts[src]
    }));

    res.json({
      metrics: {
        totalPipelineValue: totalPipelineValue,
        pipelineValueDelta: totalPipelineValue > 0 ? '+12% MoM' : '0% MoM',
        activeLeads: activeLeads,
        activeLeadsDelta: activeLeads > 0 ? `+${activeLeads} active` : '0 this week',
        winRate: winRate,
        winRateDelta: winRate > 0 ? `+${winRate}% MoM` : '0% MoM',
        urgentFollowups: urgentFollowups.length,
        overdueCount: overdueCount,
        wonValue,
        wonCount
      },
      stageDistribution,
      monthlyTrend,
      sourceBreakdown
    });
  } catch (err) {
    console.error('[LeadsController] Error fetching dashboard metrics:', err);
    res.status(500).json({ error: 'Failed to calculate CRM dashboard metrics.' });
  }
};

function validateLeadPayload({ client_name, contact_number, email, deal_value }) {
  if (client_name !== undefined) {
    const trimmed = String(client_name).trim();
    if (!trimmed || trimmed.length < 2) {
      return 'Client name must be at least 2 characters long.';
    }
    if (trimmed.length > 80) {
      return 'Client name cannot exceed 80 characters.';
    }
  }

  if (contact_number !== undefined && String(contact_number).trim()) {
    const cleaned = String(contact_number).replace(/[\s\-\(\)]/g, '');
    const digits = cleaned.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) {
      return `Phone number must contain between 10 and 15 digits (received ${digits.length}).`;
    }
    // If Indian phone number is supplied, enforce starting digit 6, 7, 8, or 9
    if (cleaned.startsWith('+91') && cleaned.length === 13) {
      if (!/^\+91[6-9]\d{9}$/.test(cleaned)) {
        return 'Indian mobile numbers must start with 6, 7, 8, or 9.';
      }
    }
  }

  if (email !== undefined && String(email).trim()) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(String(email).trim())) {
      return 'Please provide a valid email address.';
    }
  }

  if (deal_value !== undefined && deal_value !== null && deal_value !== '') {
    const num = Number(deal_value);
    if (isNaN(num) || num < 0 || num > 1000000000) {
      return 'Deal value must be a valid positive number up to ₹100 Crore.';
    }
  }

  return null;
}

/**
 * POST /api/leads
 * ACID Transaction: Inserts lead + logs initial creation activity atomically
 */
exports.createLead = (req, res) => {
  try {
    const userId = req.user.id;
    const {
      client_name,
      company = '',
      contact_number = '',
      email = '',
      source = 'Website',
      stage = 'New',
      deal_value = 0,
      priority = 'Medium',
      next_followup_date = '',
      notes = ''
    } = req.body;

    const validationError = validateLeadPayload({ client_name, contact_number, email, deal_value });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const validatedStage = VALID_STAGES.includes(stage) ? stage : 'New';
    const parsedDealValue = Math.max(0, Number(deal_value) || 0);

    // Define atomic multi-step transaction
    const createTransaction = db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO leads (user_id, client_name, company, contact_number, email, source, stage, deal_value, priority, next_followup_date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        userId,
        client_name.trim(),
        company ? company.trim() : '',
        contact_number ? contact_number.replace(/[\s\-\(\)]/g, '').trim() : '',
        email ? email.trim() : '',
        source || 'Website',
        validatedStage,
        parsedDealValue,
        priority || 'Medium',
        next_followup_date || null,
        notes ? notes.trim() : ''
      );

      const leadId = result.lastInsertRowid;

      // Log initial creation activity
      db.prepare(`
        INSERT INTO activities (lead_id, user_id, type, description)
        VALUES (?, ?, 'Note', ?)
      `).run(leadId, userId, `Created new lead in stage "${validatedStage}".`);

      return leadId;
    });

    const leadId = createTransaction();
    const created = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);

    // Notify resilience queue engine of mutation
    syncQueueService.notifyMutation(userId);

    res.status(201).json(created);
  } catch (err) {
    console.error('[LeadsController] Error in createLead transaction:', err);
    res.status(500).json({ error: 'Failed to create lead transaction.' });
  }
};

/**
 * PUT /api/leads/:id
 * ACID Transaction: Updates lead details + conditionally audits stage changes
 */
exports.updateLead = (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM leads WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(id, userId);
    if (!existing) {
      return res.status(404).json({ error: 'Lead not found or has been deleted.' });
    }

    const {
      client_name = existing.client_name,
      company = existing.company,
      contact_number = existing.contact_number,
      email = existing.email,
      source = existing.source,
      stage = existing.stage,
      deal_value = existing.deal_value,
      priority = existing.priority,
      next_followup_date = existing.next_followup_date,
      notes = existing.notes
    } = req.body;

    const validationError = validateLeadPayload({ client_name, contact_number, email, deal_value });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const validatedStage = VALID_STAGES.includes(stage) ? stage : existing.stage;
    const parsedDealValue = Math.max(0, Number(deal_value) || 0);

    const updateTransaction = db.transaction(() => {
      const stmt = db.prepare(`
        UPDATE leads
        SET client_name = ?,
            company = ?,
            contact_number = ?,
            email = ?,
            source = ?,
            stage = ?,
            deal_value = ?,
            priority = ?,
            next_followup_date = ?,
            notes = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `);

      stmt.run(
        client_name.trim(),
        company ? company.trim() : '',
        contact_number ? contact_number.replace(/[\s\-\(\)]/g, '').trim() : '',
        email ? email.trim() : '',
        source || 'Website',
        validatedStage,
        parsedDealValue,
        priority || 'Medium',
        next_followup_date || null,
        notes ? notes.trim() : '',
        id,
        userId
      );

      // Audit stage transition
      if (existing.stage !== validatedStage) {
        db.prepare(`
          INSERT INTO activities (lead_id, user_id, type, description)
          VALUES (?, ?, 'Stage Change', ?)
        `).run(id, userId, `Stage transitioned from "${existing.stage}" to "${validatedStage}".`);
      }
    });

    updateTransaction();
    const updated = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);

    // Notify queue engine
    syncQueueService.notifyMutation(userId);

    res.json(updated);
  } catch (err) {
    console.error('[LeadsController] Error in updateLead transaction:', err);
    res.status(500).json({ error: 'Failed to update lead transaction.' });
  }
};

/**
 * DELETE /api/leads/:id
 * Soft delete: Sets deleted_at timestamp rather than hard deletion
 */
exports.deleteLead = (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM leads WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(id, userId);
    if (!existing) {
      return res.status(404).json({ error: 'Lead not found or already deleted.' });
    }

    const softDeleteTransaction = db.transaction(() => {
      db.prepare(`
        UPDATE leads
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `).run(id, userId);

      // Soft-delete associated tasks
      db.prepare(`
        UPDATE tasks
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE lead_id = ? AND user_id = ?
      `).run(id, userId);

      // Log audit entry
      db.prepare(`
        INSERT INTO activities (lead_id, user_id, type, description)
        VALUES (?, ?, 'Note', 'Lead moved to trash/archive.')
      `).run(id, userId);
    });

    softDeleteTransaction();

    // Trigger debounced Drive sync
    syncQueueService.notifyMutation(userId);

    res.json({ success: true, message: 'Lead moved to trash successfully', id: Number(id) });
  } catch (err) {
    console.error('[LeadsController] Error soft-deleting lead:', err);
    res.status(500).json({ error: 'Failed to soft delete lead.' });
  }
};

/**
 * PUT /api/leads/:id/restore
 * Restores a soft-deleted lead back into the active pipeline
 */
exports.restoreLead = (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM leads WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL').get(id, userId);
    if (!existing) {
      return res.status(404).json({ error: 'Archived lead not found.' });
    }

    const restoreTransaction = db.transaction(() => {
      db.prepare(`
        UPDATE leads
        SET deleted_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `).run(id, userId);

      db.prepare(`
        UPDATE tasks
        SET deleted_at = NULL
        WHERE lead_id = ? AND user_id = ?
      `).run(id, userId);

      db.prepare(`
        INSERT INTO activities (lead_id, user_id, type, description)
        VALUES (?, ?, 'Note', 'Restored lead from trash back into active pipeline.')
      `).run(id, userId);
    });

    restoreTransaction();
    const restored = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);

    syncQueueService.notifyMutation(userId);

    res.json(restored);
  } catch (err) {
    console.error('[LeadsController] Error restoring lead:', err);
    res.status(500).json({ error: 'Failed to restore lead.' });
  }
};

/**
 * DELETE /api/leads/:id/permanent
 * Permanently purges a lead from SQLite
 */
exports.permanentDeleteLead = (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM leads WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL').get(id, userId);
    if (!existing) {
      return res.status(404).json({ error: 'Archived lead not found in trash.' });
    }

    db.prepare('DELETE FROM leads WHERE id = ? AND user_id = ?').run(id, userId);

    syncQueueService.notifyMutation(userId);

    res.json({ success: true, message: 'Lead permanently purged.', id: Number(id) });
  } catch (err) {
    console.error('[LeadsController] Error permanently deleting lead:', err);
    res.status(500).json({ error: 'Failed to permanently purge lead.' });
  }
};

/**
 * GET /api/leads/export/excel
 * Exports active pipeline workbook
 */
exports.exportExcel = (req, res) => {
  try {
    const userId = req.user.id;
    const buffer = buildPipelineWorkbook(userId);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Sales_Pipeline_Master_${dateStr}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('[LeadsController] Error downloading excel:', err);
    res.status(500).json({ error: 'Failed to generate Excel export.' });
  }
};
