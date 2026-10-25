require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Initialize database
require('./db/database');
const cloudAuthDb = require('./db/cloudAuthDb');
cloudAuthDb.initCloudDb().catch((err) => {
  console.warn('[Server] Cloud Auth DB initialization note:', err.message);
});

const authRoutes = require('./routes/authRoutes');
const leadsRoutes = require('./routes/leadsRoutes');
const activitiesRoutes = require('./routes/activitiesRoutes');
const tasksRoutes = require('./routes/tasksRoutes');
const googleRoutes = require('./routes/googleRoutes');
const syncRoutes = require('./routes/syncRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    product: 'Sales CRM - a product of SHAMIIT LLP',
    timestamp: new Date().toISOString()
  });
});

const googleController = require('./controllers/googleController');

// Mounted Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/google', googleRoutes);

// Compatibility alias for /api/followups
app.use('/api/followups', leadsRoutes);

// Google OAuth callback aliases (supports /api/google/callback, /api/auth/google/callback, and /api/sync/google/callback)
app.get('/api/sync/google/callback', googleController.handleCallback);
app.get('/api/auth/google/callback', googleController.handleCallback);
app.get('/api/google/callback', googleController.handleCallback);

app.listen(PORT, () => {
  console.log(`[SHAMIIT LLP] Sales CRM Server is running on http://localhost:${PORT}`);
});
