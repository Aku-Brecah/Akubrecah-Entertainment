#!/usr/bin/env bash
set -e

echo "=========================================="
echo "🚀 Akubrecah Clean Restart Script"
echo "=========================================="

cd /var/www/akubrecah

echo "1. Stopping and removing any stale or conflicting containers..."
docker rm -f akubrecah_app redis_cache evolution_api evolution_postgres evolution_redis caddy_proxy \
  akubrecah-akubrecah-app-1 akubrecah-redis-1 akubrecah-evolution-1 akubrecah-evolution_postgres-1 2>/dev/null || true

echo "2. Ensuring ports 3005 and 8085 are completely free..."
docker stop $(docker ps -q --filter "publish=3005") 2>/dev/null || true
docker stop $(docker ps -q --filter "publish=8085") 2>/dev/null || true
fuser -k 3005/tcp 2>/dev/null || true
fuser -k 8085/tcp 2>/dev/null || true

echo "3. Pulling latest code from origin/main..."
git pull origin main 2>/dev/null || echo "⚠️ Git pull skipped or unauthenticated (continuing with synced files)..."

echo "4. Starting clean production stack (rebuilding with synced code)..."
docker compose up -d --build

echo "5. Verifying running containers..."
sleep 4
docker compose ps

echo ""
echo "6. Verifying Evolution WhatsApp Instance & Webhook..."
INSTANCE_NAME="${EVOLUTION_INSTANCE_NAME:-Akubrecah Entertainment}"
ENCODED_INSTANCE=$(echo "$INSTANCE_NAME" | sed 's/ /%20/g')
API_KEY="${EVOLUTION_API_KEY:-}"
if [ -z "$API_KEY" ] && [ -f .env ]; then
  API_KEY=$(grep '^EVOLUTION_API_KEY=' .env | cut -d '=' -f2- | tr -d '\r"')
fi
if [ -z "$API_KEY" ]; then
  echo "⚠️ Warning: EVOLUTION_API_KEY is not set. WhatsApp instance verification skipped."
fi

# 6a. Ensure WhatsApp instance is created
curl -s -X POST "http://127.0.0.1:8085/instance/create" \
  -H "Content-Type: application/json" \
  -H "apikey: ${API_KEY}" \
  -d '{
    "instanceName": "'"${INSTANCE_NAME}"'",
    "token": "'"${API_KEY}"'",
    "qrcode": true,
    "integration": "WHATSAPP-BAILEYS"
  }' >/dev/null 2>&1 || true

# 6b. Configure instance webhook to Next.js app
curl -s -X POST "http://127.0.0.1:8085/webhook/set/${ENCODED_INSTANCE}" \
  -H "Content-Type: application/json" \
  -H "apikey: ${API_KEY}" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "http://akubrecah-app:3000/api/whatsapp/webhook?token='"${API_KEY}"'",
      "byEvents": false,
      "base64": false,
      "events": [
        "MESSAGES_UPSERT",
        "MESSAGES_UPDATE",
        "CONNECTION_UPDATE",
        "QRCODE_UPDATED"
      ]
    }
  }' >/dev/null 2>&1 || true

# 6c. Check connection state
STATE=$(curl -s "http://127.0.0.1:8085/instance/connectionState/${ENCODED_INSTANCE}" \
  -H "apikey: ${API_KEY}" 2>/dev/null | grep -o '"state":"[^"]*"' | cut -d'"' -f4 || echo "unknown")

if [ "$STATE" = "open" ]; then
  echo "🟢 WhatsApp Bot Status: CONNECTED & READY (State: open)"
else
  echo "🟡 WhatsApp Bot Status: State is '${STATE:-not connected}'."
  echo "👉 If disconnected, open https://wa.akubrecah.com/manager/ in your browser"
  echo "👉 Enter API Key: ${API_KEY}"
  echo "👉 Click on '${INSTANCE_NAME}' and scan the QR code with WhatsApp on your phone!"
fi

echo ""
echo "=========================================="
echo "✅ All containers started successfully!"
echo "=========================================="
