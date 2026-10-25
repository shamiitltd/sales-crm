# Production Deployment Guide: SHAMIIT Sales CRM

- **Application:** SHAMIIT Sales CRM
- **Domain:** `https://crm.shamiit.com`
- **Target Infrastructure:** Hostinger Linux VPS (Ubuntu 22.04 / 24.04 LTS recommended)
- **CI/CD Platform:** GitHub Actions (`.github/workflows/deploy-production.yml`)
- **Process Manager:** PM2 (`ecosystem.config.cjs`)
- **Web Server / Reverse Proxy:** Nginx (`nginx/crm.shamiit.com.conf`) with Let's Encrypt SSL
- **Database:** PostgreSQL (Cloud/Remote via `DATABASE_URL` like Neon, Supabase, AWS RDS, or local PostgreSQL on the VPS) with automatic SQLite fallback (`crm.db`).

---

## 1. Architectural Overview

The deployment architecture uses an **atomic, zero-downtime symlink release strategy**:

```text
/var/www/sales-crm/                  <-- $VPS_APP_PATH
├── releases/
│   ├── 20261025180000-81228d5/      <-- Immutable release directory
│   │   ├── client/dist/             <-- Compiled static frontend assets
│   │   ├── server/                  <-- Backend API code & production dependencies
│   │   │   ├── .env -> ../../shared/.env
│   │   │   └── crm.db -> ../../shared/data/crm.db
│   │   ├── ecosystem.config.cjs
│   │   └── scripts/
│   └── 20261025170000-prevsha/      <-- Kept for instant rollback (last 5 retained)
├── shared/                          <-- PERSISTENT DATA (Never overwritten by deployments)
│   ├── .env                         <-- Production environment variables & secrets
│   ├── data/
│   │   ├── crm.db                   <-- Persistent SQLite fallback database
│   │   ├── crm.db-shm
│   │   └── crm.db-wal
│   └── logs/                        <-- PM2 and application error & output logs
└── current -> releases/20261025180000-81228d5  <-- Symlink to active release
```

### Why this architecture?
1. **Zero Downtime:** Builds happen inside GitHub Actions runners. Only pre-validated, compiled release artifacts are sent to the VPS.
2. **Atomic Switching:** The `current` symlink is updated atomically using `ln -sfn ... current_tmp && mv -Tf current_tmp current`.
3. **Data Protection:** Customer data (`shared/data/crm.db`) and secrets (`shared/.env`) live outside the disposable release directories and are never touched by CI/CD updates.
4. **Instant Rollback:** If a release fails health checks, `scripts/rollback.sh` immediately points `current` back to the previous release and triggers `pm2 reload sales-crm-server`.
5. **Disk Hygiene:** Older releases beyond the 5 most recent are automatically pruned after every successful deployment.

---

## 2. Required GitHub Repository Secrets

Configure the following secrets in GitHub under **Settings > Secrets and variables > Actions** (or within a GitHub Environment named `production`):

| Secret Name | Required | Example / Description |
|---|---|---|
| `VPS_HOST` | **Yes** | Public IP address or hostname of your Hostinger VPS (e.g. `185.193.12.34` or `vps.shamiit.com`) |
| `VPS_USER` | **Yes** | SSH user on the VPS with permissions to write to `$VPS_APP_PATH` and manage PM2 (e.g. `deploy` or `root`) |
| `VPS_SSH_KEY` | **Yes** | OpenSSH Private Key (ed25519 or RSA) corresponding to the public key added to `~/.ssh/authorized_keys` on the VPS |
| `VPS_SSH_PORT` | No | SSH port (defaults to `22` if omitted) |
| `VPS_APP_PATH` | No | Root path for application deployments (defaults to `/var/www/sales-crm` if omitted) |
| `VPS_KNOWN_HOSTS` | Optional | Output of `ssh-keyscan -p <PORT> -H <VPS_HOST>`. If omitted, the workflow runs keyscan automatically with strict host verification. |

> [!SECURITY NOTE]
> Never put database credentials, JWT secrets, or Google OAuth secrets in GitHub Actions secrets. They belong strictly in the server's persistent `shared/.env` file on the VPS.

---

## 3. Hostinger VPS One-Time Preparation

Execute the following commands once on your Hostinger VPS via SSH to prepare the environment:

### Step 3.1 — Install Node.js (v20 LTS), PM2, Nginx, and Certbot

```bash
# 1. Update package list and install system utilities
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git rsync tar build-essential nginx certbot python3-certbot-nginx

# 2. Install Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Verify versions
node -v # Expected: v20.x.x
npm -v

# 4. Install PM2 globally
sudo npm install -g pm2
pm2 startup systemd
# Follow any on-screen instruction printed by pm2 startup
```

### Step 3.2 — Create the Dedicated Deployment User (Recommended)

To adhere to least-privilege security principles:

```bash
# Create user 'deploy' with bash shell
sudo adduser --gecos "" deploy
sudo usermod -aG www-data deploy

# Setup SSH directory for deploy user
sudo -u deploy mkdir -p /home/deploy/.ssh
sudo -u deploy chmod 700 /home/deploy/.ssh

# Paste your deployment public key (from your computer or CI keypair)
sudo -u deploy nano /home/deploy/.ssh/authorized_keys
sudo -u deploy chmod 600 /home/deploy/.ssh/authorized_keys

# Allow deploy user to manage PM2 and reload Nginx without password prompts
echo "deploy ALL=(ALL) NOPASSWD: /usr/sbin/nginx -t, /usr/sbin/service nginx reload, /usr/sbin/service nginx restart" | sudo tee /etc/sudoers.d/deploy-nginx
```

*(Note: If you choose to deploy directly using `root`, ensure the root user has the SSH key in `/root/.ssh/authorized_keys`.)*

### Step 3.3 — Initialize the Application Directory and `shared/.env`

```bash
# Create application directory structure
sudo mkdir -p /var/www/sales-crm/shared/data
sudo mkdir -p /var/www/sales-crm/shared/logs
sudo mkdir -p /var/www/sales-crm/releases

# Set ownership to deploy user (or root if using root)
sudo chown -R deploy:deploy /var/www/sales-crm
sudo chmod -R 775 /var/www/sales-crm

# Create the persistent production .env file
sudo -u deploy nano /var/www/sales-crm/shared/.env
```

Populate `/var/www/sales-crm/shared/.env` with your real production values:

```env
# Server Configuration
PORT=5000
NODE_ENV=production
CLIENT_URL=https://crm.shamiit.com
JWT_SECRET=YOUR_STRONG_RANDOM_JWT_SECRET_HERE

# PostgreSQL Database (Neon / Supabase / Render / Local VPS Postgres)
# e.g.: postgresql://postgres:password@db.project.supabase.co:5432/postgres?sslmode=require
DATABASE_URL=postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE?sslmode=require

# Google OAuth2 Credentials (for User-specific Google Drive sync)
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://crm.shamiit.com/api/auth/google/callback
```

Lock down file permissions so only the deployment user can read it:
```bash
chmod 600 /var/www/sales-crm/shared/.env
```

---

## 4. Domain & Nginx Configuration (`crm.shamiit.com`)

### Step 4.1 — DNS Record
In your DNS provider (Cloudflare, Hostinger DNS, Namecheap, etc.):
- Create an **A Record**:
  - **Name:** `crm`
  - **Value / Points to:** `<YOUR_HOSTINGER_VPS_IP>`
  - **TTL:** Auto or 300 seconds

### Step 4.2 — Obtain SSL Certificate via Certbot

Before deploying Nginx, generate the SSL certificate:

```bash
# Stop Nginx temporarily to allow standalone Certbot validation
sudo systemctl stop nginx

# Request certificate for crm.shamiit.com
sudo certbot certonly --standalone -d crm.shamiit.com --non-interactive --agree-tos -m admin@shamiit.com

# Start Nginx back up
sudo systemctl start nginx
```

### Step 4.3 — Install Nginx Site Configuration

Copy the provided Nginx configuration into place:

```bash
# Copy nginx config from repository or create it
sudo nano /etc/nginx/sites-available/crm.shamiit.com.conf
# (Paste contents of nginx/crm.shamiit.com.conf)

# Enable the site
sudo ln -s /etc/nginx/sites-available/crm.shamiit.com.conf /etc/nginx/sites-enabled/

# Test syntax
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 5. Health Checks & Verification

The deployment workflow automatically runs a two-tier health check:

1. **Local Pre-Flight (VPS-side in `deploy.sh`):**
   - Directly checks `http://127.0.0.1:5000/api/health`.
   - Verifies the Node.js server booted and can reach the database (`database: { status: 'healthy' }`).
2. **Public Verification (GitHub Actions Runner):**
   - Polls `https://crm.shamiit.com` to confirm frontend assets load (HTTP 200).
   - Polls `https://crm.shamiit.com/api/health` through the internet to confirm DNS, SSL, Nginx reverse proxy, and backend routes function end-to-end.

Sample response from `GET /api/health`:
```json
{
  "status": "online",
  "product": "Sales CRM - a product of SHAMIIT LLP",
  "database": {
    "engine": "postgresql",
    "status": "healthy"
  },
  "timestamp": "2026-10-25T18:15:00.000Z"
}
```

---

## 6. Rollback Procedures

### Automated Rollback
If the deployment fails during the VPS setup or during public health verification:
1. GitHub Actions detects the non-200 response or timeout.
2. The `verify-health` step triggers `scripts/rollback.sh` on the VPS via SSH.
3. The script locates `.previous_release`, points `current` back to it, and reloads PM2 without human intervention.
4. The GitHub Actions job fails with clear diagnostics.

### Manual Emergency Rollback
If an issue or bug is discovered after a deployment has already succeeded, an administrator can trigger an immediate rollback either via GitHub Actions or via SSH:

#### Method A: Via SSH on the VPS
```bash
# Connect to VPS
ssh deploy@<VPS_HOST>

# Execute rollback script
/var/www/sales-crm/current/scripts/rollback.sh /var/www/sales-crm
```

#### Method B: Re-deploy a previous Git commit via GitHub
Run the GitHub Actions workflow manually via **Actions > Deploy Sales CRM to Production > Run workflow**, targeting the previous known-good commit.

---

## 7. Operational Runbook & Maintenance

### Useful PM2 Commands on VPS
```bash
# View process status
pm2 status

# View live streaming logs
pm2 logs sales-crm-server

# View last 100 error lines
pm2 logs sales-crm-server --lines 100 --err

# Restart server manually
pm2 restart sales-crm-server
```

### Useful Nginx Commands on VPS
```bash
# Test Nginx configuration
sudo nginx -t

# View Nginx access log
sudo tail -f /var/log/nginx/crm.shamiit.com.access.log

# View Nginx error log
sudo tail -f /var/log/nginx/crm.shamiit.com.error.log
```
