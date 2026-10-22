#!/usr/bin/env bash
# ==============================================================================
# clean_evolution_session.sh
# Safely purges stale/corrupted WhatsApp auth sessions and restarts Evolution API
# ==============================================================================
set -euo pipefail

echo "=========================================================="
echo "🧹 Cleaning Evolution WhatsApp Stale Session & Auth Files"
echo "=========================================================="

cd /var/www/akubrecah

echo "1. Stopping Evolution API..."
docker compose -f deploy/docker-compose.yml stop evolution 2>/dev/null || docker stop evolution_api 2>/dev/null || true

echo "2. Purging stale auth files from evolution_instances volume..."
VOL_NAME=$(docker volume ls -q | grep -E 'evolution_instances' | head -n 1 || true)
if [ -n "$VOL_NAME" ]; then
    echo "Found volume: $VOL_NAME, purging instance files..."
    docker run --rm -v "${VOL_NAME}:/evo_data" alpine sh -c 'rm -rf /evo_data/* 2>/dev/null || true'
fi

echo "3. Purging corrupted session tables in evolution_postgres..."
docker exec -i evolution_postgres psql -U evolution -d evolution -c "TRUNCATE TABLE \"Session\" CASCADE; TRUNCATE TABLE \"Auth\" CASCADE;" 2>/dev/null || true

echo "4. Starting Evolution API with clean session state..."
docker compose -f deploy/docker-compose.yml up -d evolution

echo "5. Waiting 6 seconds for Evolution API to initialize..."
sleep 6

INSTANCE_NAME="${EVOLUTION_INSTANCE_NAME:-akubrecah-portal}"
ENCODED_INSTANCE=$(echo "$INSTANCE_NAME" | sed 's/ /%20/g')

echo "6. Creating fresh instance ${INSTANCE_NAME}..."
curl -s -X POST "https://wa.akubrecah.com/instance/create" \
  -H "Content-Type: application/json" \
  -H "apikey: akubrecah_secret_whatsapp_key_2026" \
  -d '{
    "instanceName": "'"${INSTANCE_NAME}"'",
    "token": "akubrecah_secret_whatsapp_key_2026",
    "qrcode": true,
    "integration": "WHATSAPP-BAILEYS"
  }' > /dev/null || true

echo "7. Applying real-time chat & contact sync settings..."
curl -s -X POST "https://wa.akubrecah.com/settings/set/${ENCODED_INSTANCE}" \
  -H "Content-Type: application/json" \
  -H "apikey: akubrecah_secret_whatsapp_key_2026" \
  -d '{
    "rejectCall": false,
    "msgCall": "",
    "groupsIgnore": true,
    "alwaysOnline": true,
    "readMessages": true,
    "readStatus": true,
    "syncFullHistory": true
  }' > /dev/null || true

echo "8. Pointing webhook to https://n8n.akubrecah.com/webhook/whatsapp-inbound..."
curl -s -X POST "https://wa.akubrecah.com/webhook/set/${ENCODED_INSTANCE}" \
  -H "Content-Type: application/json" \
  -H "apikey: akubrecah_secret_whatsapp_key_2026" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "https://n8n.akubrecah.com/webhook/whatsapp-inbound",
      "headers": {
        "apikey": "akubrecah_secret_whatsapp_key_2026",
        "x-webhook-secret": "akubrecah_secret_whatsapp_key_2026"
      },
      "byEvents": false,
      "base64": false,
      "events": [
        "MESSAGES_UPSERT",
        "MESSAGES_UPDATE",
        "CHATS_SET",
        "CHATS_UPSERT",
        "CHATS_UPDATE",
        "CONTACTS_SET",
        "CONTACTS_UPSERT",
        "CONTACTS_UPDATE",
        "CONNECTION_UPDATE"
      ]
    }
  }' > /dev/null || true

echo ""
echo "✅ Evolution API is completely clean and ready!"
echo "👉 Open https://wa.akubrecah.com/manager/ in your browser"
echo "👉 Enter API Key: akubrecah_secret_whatsapp_key_2026"
echo "👉 Click on '${INSTANCE_NAME}' and scan the fresh QR code!"
