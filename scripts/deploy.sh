#!/usr/bin/env bash
# ==============================================================================
# Production Deployment Script for SHAMIIT Sales CRM
# Domain: crm.shamiit.com
# Target: Hostinger VPS
# ==============================================================================

set -euo pipefail

APP_PATH="${1:-/var/www/sales-crm}"
RELEASE_ID="${2:-}"
ARTIFACT_PATH="${3:-}"

echo "=========================================================="
echo " Starting Deployment for SHAMIIT Sales CRM"
echo " Time:       $(date -u +"%Y-%m-%d %H:%M:%SZ")"
echo " APP_PATH:   ${APP_PATH}"
echo " RELEASE_ID: ${RELEASE_ID}"
echo "=========================================================="

if [ -z "${RELEASE_ID}" ] || [ -z "${ARTIFACT_PATH}" ]; then
  echo "[-] ERROR: Missing required arguments."
  echo "    Usage: $0 <APP_PATH> <RELEASE_ID> <ARTIFACT_PATH>"
  exit 1
fi

if [ ! -f "${ARTIFACT_PATH}" ]; then
  echo "[-] ERROR: Artifact file not found at ${ARTIFACT_PATH}"
  exit 1
fi

# Ensure shared configuration directory exists
mkdir -p "${APP_PATH}/shared/data"
mkdir -p "${APP_PATH}/shared/logs"
mkdir -p "${APP_PATH}/releases"

# Verify that shared/.env exists on the server
if [ ! -f "${APP_PATH}/shared/.env" ]; then
  echo "[-] ERROR: Production environment file ${APP_PATH}/shared/.env is missing!"
  echo "    Please create this file with your production environment variables before deploying."
  exit 1
fi

NEW_RELEASE_DIR="${APP_PATH}/releases/${RELEASE_ID}"

if [ -d "${NEW_RELEASE_DIR}" ]; then
  echo "[!] WARNING: Directory ${NEW_RELEASE_DIR} already exists. Cleaning up before extraction."
  rm -rf "${NEW_RELEASE_DIR}"
fi

mkdir -p "${NEW_RELEASE_DIR}"

echo "[+] Extracting release artifact into ${NEW_RELEASE_DIR}..."
tar -xzf "${ARTIFACT_PATH}" -C "${NEW_RELEASE_DIR}"

# Verify required files exist in extracted package
if [ ! -f "${NEW_RELEASE_DIR}/client/dist/index.html" ]; then
  echo "[-] ERROR: Missing frontend build artifact (client/dist/index.html)"
  exit 1
fi

if [ ! -f "${NEW_RELEASE_DIR}/server/server.js" ] || [ ! -f "${NEW_RELEASE_DIR}/server/index.js" ]; then
  echo "[-] ERROR: Missing backend entrypoint (server/server.js or server/index.js)"
  exit 1
fi

echo "[+] Linking shared production files into release..."
# Link server .env to persistent shared/.env
ln -sfn "${APP_PATH}/shared/.env" "${NEW_RELEASE_DIR}/server/.env"

# Link SQLite database to persistent shared/data/crm.db (fallback and local cache)
if [ ! -f "${APP_PATH}/shared/data/crm.db" ]; then
  touch "${APP_PATH}/shared/data/crm.db"
fi
ln -sfn "${APP_PATH}/shared/data/crm.db" "${NEW_RELEASE_DIR}/server/crm.db"

# Link shared logs directory
ln -sfn "${APP_PATH}/shared/logs" "${NEW_RELEASE_DIR}/logs"

echo "[+] Installing backend production dependencies..."
cd "${NEW_RELEASE_DIR}/server"
npm ci --omit=dev --ignore-scripts --no-audit --no-fund

echo "[+] Validating server syntax..."
node --check server.js
node --check index.js

# Record previous release before switching symlink
if [ -L "${APP_PATH}/current" ]; then
  CURRENT_TARGET=$(readlink -f "${APP_PATH}/current" || true)
  if [ -n "${CURRENT_TARGET}" ] && [ -d "${CURRENT_TARGET}" ]; then
    echo "${CURRENT_TARGET}" > "${APP_PATH}/.previous_release"
    echo "[+] Recorded previous release: ${CURRENT_TARGET}"
  fi
fi

echo "[+] Atomically switching 'current' symlink to ${NEW_RELEASE_DIR}..."
ln -sfn "${NEW_RELEASE_DIR}" "${APP_PATH}/current_tmp"
mv -Tf "${APP_PATH}/current_tmp" "${APP_PATH}/current"

echo "[+] Reloading / starting application via PM2..."
cd "${APP_PATH}/current"

# Check if PM2 is running the process
if pm2 describe sales-crm-server > /dev/null 2>&1; then
  echo "[+] Reloading existing PM2 process 'sales-crm-server'..."
  pm2 reload ecosystem.config.cjs --env production --update-env
else
  echo "[+] Starting PM2 process 'sales-crm-server'..."
  pm2 start ecosystem.config.cjs --env production
fi
pm2 save

echo "[+] Performing local pre-flight health check (http://127.0.0.1:5000/api/health)..."
MAX_ATTEMPTS=12
ATTEMPT=0
HEALTH_OK=0

while [ ${ATTEMPT} -lt ${MAX_ATTEMPTS} ]; do
  ATTEMPT=$((ATTEMPT + 1))
  sleep 2
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/api/health || echo "000")
  if [ "${HTTP_STATUS}" = "200" ]; then
    echo "[+] Local pre-flight health check PASSED on attempt ${ATTEMPT} (HTTP 200)"
    HEALTH_OK=1
    break
  else
    echo "[.] Attempt ${ATTEMPT}/${MAX_ATTEMPTS}: Health endpoint returned HTTP ${HTTP_STATUS}. Waiting..."
  fi
done

if [ ${HEALTH_OK} -ne 1 ]; then
  echo "[-] Local pre-flight health check FAILED after ${MAX_ATTEMPTS} attempts!"
  echo "[-] Initiating automated rollback..."
  if [ -f "${NEW_RELEASE_DIR}/scripts/rollback.sh" ]; then
    bash "${NEW_RELEASE_DIR}/scripts/rollback.sh" "${APP_PATH}"
  elif [ -f "${APP_PATH}/current/scripts/rollback.sh" ]; then
    bash "${APP_PATH}/current/scripts/rollback.sh" "${APP_PATH}"
  fi
  exit 1
fi

echo "[+] Pruning old releases (retaining 5 most recent)..."
cd "${APP_PATH}/releases"
# List directories sorted by modification time, skip the 5 most recent, delete older ones
ls -dt */ 2>/dev/null | tail -n +6 | while read -r OLD_DIR; do
  if [ -n "${OLD_DIR}" ] && [ -d "${OLD_DIR}" ]; then
    echo "[+] Removing old release: ${OLD_DIR}"
    rm -rf "${OLD_DIR}"
  fi
done

# Clean up uploaded tarball
if [ -f "${ARTIFACT_PATH}" ]; then
  rm -f "${ARTIFACT_PATH}"
fi

echo "=========================================================="
echo " Deployment ${RELEASE_ID} completed successfully!"
echo " Time: $(date -u +"%Y-%m-%d %H:%M:%SZ")"
echo "=========================================================="
