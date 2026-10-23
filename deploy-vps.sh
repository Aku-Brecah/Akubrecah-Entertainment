#!/usr/bin/env bash
set -e

VPS_USER="root"
VPS_HOST="169.58.96.131"
REMOTE_DIR="/var/www/akubrecah"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=================================================="
echo "🚀 Deploying Akubrecah directly to VPS: ${VPS_HOST}"
echo "=================================================="

echo ""
echo "📦 Step 1: Syncing project files to ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}..."

rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude 'temp' \
  --exclude '.agents' \
  --exclude '.agent' \
  --exclude 'redis-data' \
  --exclude 'evolution-data' \
  --exclude 'evolution-postgres-data' \
  "${LOCAL_DIR}/" \
  "${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/"

echo ""
echo "🔄 Step 2: Executing restart.sh on VPS to apply updates..."
ssh "${VPS_USER}@${VPS_HOST}" "bash ${REMOTE_DIR}/restart.sh"

echo ""
echo "=================================================="
echo "✅ Direct VPS deployment complete and services live!"
echo "=================================================="
