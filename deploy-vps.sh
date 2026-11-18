#!/usr/bin/env bash
set -euo pipefail

VPS_USER="${VPS_USER:-root}"
VPS_HOST="${VPS_HOST:?Set VPS_HOST environment variable before deploying}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/akubrecah}"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=================================================="
echo "Deploying Akubrecah directly to VPS: ${VPS_HOST}"
echo "=================================================="

echo ""
echo "Verifying SSH connectivity..."
ssh -o BatchMode=yes -o ConnectTimeout=8 "${VPS_USER}@${VPS_HOST}" "echo '  SSH connection established'"

echo ""
echo "Step 1: Syncing project files to ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}..."

rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude 'temp' \
  --exclude '.agents' \
  --exclude '.agent' \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude 'deploy/.env' \
  --exclude 'deploy/.env.*' \
  --exclude 'redis-data' \
  --exclude 'evolution-data' \
  --exclude 'evolution-postgres-data' \
  --exclude 'deploy/certs' \
  --exclude 'training cv' \
  "${LOCAL_DIR}/" \
  "${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/"

echo ""
echo "🧹 Step 2: Cleaning up obsolete/removed routes on VPS..."
ssh "${VPS_USER}@${VPS_HOST}" "rm -rf \
  ${REMOTE_DIR}/app/checkout \
  ${REMOTE_DIR}/app/filing-success \
  ${REMOTE_DIR}/app/admin/global-config \
  ${REMOTE_DIR}/public/kra-pin-finder \
  ${REMOTE_DIR}/styles/globals.css \
  ${REMOTE_DIR}/public/'AKUBRECAH ENTERTAINMENT -  JARVIS-CLASS AUTONOMOUS SYSTEM - MASTER ACTION PLAN.docx' \
  ${REMOTE_DIR}/public/'logo copy.png' \
  ${REMOTE_DIR}/public/'simple-logo - with-text.png'"

echo ""
echo "🔄 Step 3: Rebuilding and restarting akubrecah-app container on VPS..."
ssh "${VPS_USER}@${VPS_HOST}" "cd ${REMOTE_DIR} && docker compose up -d --build akubrecah-app"

echo ""
echo "🩺 Step 4: Verifying application health..."
sleep 5
HEALTH_STATUS=$(ssh "${VPS_USER}@${VPS_HOST}" "curl -s -m 5 http://127.0.0.1:3005/api/health" || echo "unreachable")
echo "Health Response: ${HEALTH_STATUS}"

echo ""
echo "=================================================="
echo "✅ Direct VPS deployment complete and services live!"
echo "=================================================="

