const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'crm.db');
const db = new Database(dbPath);

// Enable WAL mode for concurrent performance and reliability
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS followups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT NOT NULL,
    contact_number TEXT,
    email TEXT,
    lead_status TEXT NOT NULL DEFAULT 'New',
    deal_value REAL DEFAULT 0,
    followup_date TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_followup_date ON followups (followup_date);
  CREATE INDEX IF NOT EXISTS idx_lead_status ON followups (lead_status);
`);

// Helper to get formatted date string (YYYY-MM-DD)
function getOffsetDate(daysOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

// Seed initial realistic data if database is empty
const countStmt = db.prepare('SELECT COUNT(*) as count FROM followups');
const rowCount = countStmt.get().count;

if (rowCount === 0) {
  const insertStmt = db.prepare(`
    INSERT INTO followups (client_name, contact_number, email, lead_status, deal_value, followup_date, notes, created_at)
    VALUES (@client_name, @contact_number, @email, @lead_status, @deal_value, @followup_date, @notes, @created_at)
  `);

  const initialFollowups = [
    {
      client_name: 'Acme Global Solutions',
      contact_number: '+91 98201 54321',
      email: 'rahul.kapoor@acmeglobal.com',
      lead_status: 'Follow-up Scheduled',
      deal_value: 185000,
      followup_date: getOffsetDate(0), // Today
      notes: 'Demo scheduled for ERP workflow automation. Client requested quotation before EOD.',
      created_at: new Date(Date.now() - 5 * 86400000).toISOString()
    },
    {
      client_name: 'Zenith Retail Infra',
      contact_number: '+91 99112 87654',
      email: 'priya.sharma@zenithretail.in',
      lead_status: 'In Discussion',
      deal_value: 320000,
      followup_date: getOffsetDate(0), // Today
      notes: 'Reviewing proposal scope for multi-store POS synchronization module.',
      created_at: new Date(Date.now() - 8 * 86400000).toISOString()
    },
    {
      client_name: 'Horizon Tech Labs',
      contact_number: '+91 97405 12987',
      email: 'arun.nair@horizontech.io',
      lead_status: 'New',
      deal_value: 95000,
      followup_date: getOffsetDate(1), // Tomorrow
      notes: 'Inbound lead from website inquiry. Interested in custom sales pipeline tracking tool.',
      created_at: new Date(Date.now() - 1 * 86400000).toISOString()
    },
    {
      client_name: 'Nexus FinTech Pvt Ltd',
      contact_number: '+91 98450 33445',
      email: 'vikram.mehta@nexusfin.com',
      lead_status: 'Closed Won',
      deal_value: 540000,
      followup_date: getOffsetDate(-3),
      notes: 'Contract signed! Initial 50% milestone invoice cleared. Onboarding starts next Monday.',
      created_at: new Date(Date.now() - 15 * 86400000).toISOString()
    },
    {
      client_name: 'Starlight Health Systems',
      contact_number: '+91 96500 78901',
      email: 'dr.ananya@starlighthealth.org',
      lead_status: 'Follow-up Scheduled',
      deal_value: 275000,
      followup_date: getOffsetDate(2),
      notes: 'Sent revised compliance and data protection questionnaire.',
      created_at: new Date(Date.now() - 10 * 86400000).toISOString()
    },
    {
      client_name: 'Vanguard Logistics',
      contact_number: '+91 93210 65432',
      email: 'suresh.patel@vanguardlog.in',
      lead_status: 'In Discussion',
      deal_value: 160000,
      followup_date: getOffsetDate(-1), // Overdue
      notes: 'Needs confirmation on SLA and 24/7 dedicated support cost breakdown.',
      created_at: new Date(Date.now() - 12 * 86400000).toISOString()
    },
    {
      client_name: 'BlueWave Digital Media',
      contact_number: '+91 98711 22334',
      email: 'neha.verma@bluewave.agency',
      lead_status: 'Closed Won',
      deal_value: 210000,
      followup_date: getOffsetDate(-7),
      notes: 'Annual CRM license renewal completed. Retainer agreement active.',
      created_at: new Date(Date.now() - 25 * 86400000).toISOString()
    },
    {
      client_name: 'Aura Green Energy',
      contact_number: '+91 91234 56789',
      email: 'karan.singh@auragreen.com',
      lead_status: 'Closed Lost',
      deal_value: 120000,
      followup_date: getOffsetDate(-14),
      notes: 'Decided to postpone technology overhaul to next fiscal quarter.',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString()
    }
  ];

  const seedTransaction = db.transaction((items) => {
    for (const item of items) {
      insertStmt.run(item);
    }
  });

  seedTransaction(initialFollowups);
}

module.exports = db;
