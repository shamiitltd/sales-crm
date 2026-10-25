/**
 * PM2 Ecosystem Configuration for SHAMIIT Sales CRM
 * Production target: crm.shamiit.com on Hostinger VPS
 */

module.exports = {
  apps: [
    {
      name: 'sales-crm-server',
      script: 'server/index.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      time: true,
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};
