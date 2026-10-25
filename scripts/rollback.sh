#!/usr/bin/env bash
# ==============================================================================
# Emergency Rollback Script for SHAMIIT Sales CRM
# Domain: crm.shamiit.com
# Target: Hostinger VPS
# ==============================================================================

set -euo pipefail

APP_PATH="${1:-/var/www/sales-crm}"

echo "=========================================================="
echo " Starting Rollback for SHAMIIT Sales CRM"
echo " Time:     $(date -u +"%Y-%m-%d %H:%M:%SZ")"
echo " APP_PATH: ${APP_PATH}"
echo "=========================================================="

ROLLBACK_TARGET=""

# 1. Check if .previous_release file exists
if [ -f "${APP_PATH}/.previous_release" ]; then
  CANDIDATE=$(cat "${APP_PATH}/.previous_release" | tr -d '\r\n')
  if [ -n "${CANDIDATE}" ] && [ -d "${CANDIDATE}" ]; then
    ROLLBACK_TARGET="${CANDIDATE}"
  fi
fi

# 2. Fallback: Find the newest release in releases/ that is not the current release
if [ -z "${ROLLBACK_TARGET}" ]; then
  CURRENT_REALPATH=$(readlink -f "${APP_PATH}/current" || echo "")
  for DIR in $(ls -dt "${APP_PATH}/releases/"*/ 2>/dev/null); do
    DIR_CLEAN=$(readlink -f "${DIR}" || echo "")
    if [ "${DIR_CLEAN}" != "${CURRENT_REALPATH}" ] && [ -d "${DIR_CLEAN}" ]; then
      ROLLBACK_TARGET="${DIR_CLEAN}"
      break
    fi
  done
fi

if [ -z "${ROLLBACK_TARGET}" ] || [ ! -d "${ROLLBACK_TARGET}" ]; then
  echo "[-] ERROR: No previous release directory found to roll back to!"
  exit 1
fi

echo "[+] Rolling back active release to: ${ROLLBACK_TARGET}"

# Atomically switch symlink back
ln -sfn "${ROLLBACK_TARGET}" "${APP_PATH}/current_tmp"
mv -Tf "${APP_PATH}/current_tmp" "${APP_PATH}/current"

# Reload PM2 with previous release configuration
echo "[+] Reloading PM2 process 'sales-crm-server' on rolled-back release..."
cd "${APP_PATH}/current"
pm2 reload ecosystem.config.cjs --env production --update-env
pm2 save

echo "[+] Verifying health of rolled back release..."
sleep 2
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/api/health || echo "000")
if [ "${HEALTH_STATUS}" = "200" ]; then
  echo "[+] Rollback SUCCESSFUL! Previous release is healthy (HTTP 200)."
  echo "=========================================================="
  exit 0
else
  echo "[-] WARNING: Rolled back release returned HTTP ${HEALTH_STATUS}."
  echo "[-] Check PM2 logs: pm2 logs sales-crm-server --lines 50"
  echo "=========================================================="
  exit 1
fi
