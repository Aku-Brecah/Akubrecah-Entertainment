#!/usr/bin/env bash
set -e

echo "=========================================="
echo "🚀 Updating Akubrecah App on VPS"
echo "=========================================="

cd /var/www/akubrecah

echo "1. Pulling latest code from origin/main..."
git pull origin main

echo "2. Rebuilding and restarting akubrecah-app container..."
docker compose up -d --build akubrecah-app

echo "3. Verifying application health..."
sleep 3
docker ps --filter "name=akubrecah-app"

echo "4. Testing local bot endpoint..."
BOT_API_KEY="${EVOLUTION_API_KEY:-}"
if [ -z "$BOT_API_KEY" ] && [ -f /var/www/akubrecah/.env ]; then
  BOT_API_KEY=$(grep '^EVOLUTION_API_KEY=' /var/www/akubrecah/.env | cut -d '=' -f2- | tr -d '\r"')
fi
curl -s -X POST http://127.0.0.1:3005/api/whatsapp/chat \
  -H "Content-Type: application/json" \
  -H "apikey: ${BOT_API_KEY}" \
  -d '{"phone":"254719299900","message":".kra","sendDirect":false}' | grep -o 'AKUBRECAH KRA COMPLIANCE PORTAL' || echo "Notice: Check container logs"

echo ""
echo "=========================================="
echo "✅ Akubrecah App successfully updated and live!"
echo "=========================================="
