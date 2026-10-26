#!/usr/bin/env bash
# ==============================================================================
# migrate_n8n_domain.sh
# Safely updates n8n domain & webhook URLs from old domain to n8n.akubrecah.com
# ==============================================================================
set -euo pipefail

echo "=========================================================="
echo "🚀 Migrating n8n to https://n8n.akubrecah.com"
echo "=========================================================="

N8N_DIR=""
if [ -d "/root/n8n" ]; then
    N8N_DIR="/root/n8n"
elif [ -d "/var/www/n8n" ]; then
    N8N_DIR="/var/www/n8n"
elif [ -d "/home/ubuntu/n8n" ]; then
    N8N_DIR="/home/ubuntu/n8n"
fi

echo "📍 Found n8n directory: ${N8N_DIR:-'Searching docker container...'}"

# 1. Update .env file if it exists
if [ -n "$N8N_DIR" ] && [ -f "$N8N_DIR/.env" ]; then
    echo "📄 Updating $N8N_DIR/.env..."
    cp "$N8N_DIR/.env" "$N8N_DIR/.env.bak_$(date +%s)"
    
    # Replace old domain references
    sed -i 's|vybeafrica\.org|akubrecah\.com|g' "$N8N_DIR/.env"
    sed -i 's|http://localhost:5678|https://n8n.akubrecah.com|g' "$N8N_DIR/.env"
    
    # Ensure key variables are set or appended
    if grep -q "^WEBHOOK_URL=" "$N8N_DIR/.env"; then
        sed -i 's|^WEBHOOK_URL=.*|WEBHOOK_URL=https://n8n.akubrecah.com/|' "$N8N_DIR/.env"
    else
        echo "WEBHOOK_URL=https://n8n.akubrecah.com/" >> "$N8N_DIR/.env"
    fi

    if grep -q "^N8N_HOST=" "$N8N_DIR/.env"; then
        sed -i 's|^N8N_HOST=.*|N8N_HOST=n8n.akubrecah.com|' "$N8N_DIR/.env"
    else
        echo "N8N_HOST=n8n.akubrecah.com" >> "$N8N_DIR/.env"
    fi

    if grep -q "^N8N_EDITOR_BASE_URL=" "$N8N_DIR/.env"; then
        sed -i 's|^N8N_EDITOR_BASE_URL=.*|N8N_EDITOR_BASE_URL=https://n8n.akubrecah.com/|' "$N8N_DIR/.env"
    else
        echo "N8N_EDITOR_BASE_URL=https://n8n.akubrecah.com/" >> "$N8N_DIR/.env"
    fi

    if grep -q "^N8N_PROTOCOL=" "$N8N_DIR/.env"; then
        sed -i 's|^N8N_PROTOCOL=.*|N8N_PROTOCOL=https|' "$N8N_DIR/.env"
    else
        echo "N8N_PROTOCOL=https" >> "$N8N_DIR/.env"
    fi
fi

# 2. Update docker-compose.yml if it exists
if [ -n "$N8N_DIR" ] && [ -f "$N8N_DIR/docker-compose.yml" ]; then
    echo "📄 Checking $N8N_DIR/docker-compose.yml..."
    cp "$N8N_DIR/docker-compose.yml" "$N8N_DIR/docker-compose.yml.bak_$(date +%s)"
    sed -i 's|vybeafrica\.org|akubrecah\.com|g' "$N8N_DIR/docker-compose.yml"
fi

# 3. Restart n8n container
echo "🔄 Restarting n8n service..."
if [ -n "$N8N_DIR" ] && [ -f "$N8N_DIR/docker-compose.yml" ]; then
    cd "$N8N_DIR"
    docker compose up -d --force-recreate n8n 2>/dev/null || docker compose restart n8n || docker-compose restart n8n
else
    # Find container by name
    N8N_CONTAINER=$(docker ps -a --format '{{.Names}}' | grep -E 'n8n' | grep -v 'caddy' | head -n 1 || true)
    if [ -n "$N8N_CONTAINER" ]; then
        echo "Restarting container $N8N_CONTAINER..."
        docker restart "$N8N_CONTAINER"
    fi
fi

echo "⏳ Waiting 5 seconds for n8n to initialize..."
sleep 5

# 4. Verify n8n settings
echo "🔍 Verifying active n8n configuration..."
RESPONSE=$(curl -s https://n8n.akubrecah.com/rest/settings || true)
echo "n8n response: $RESPONSE"

if echo "$RESPONSE" | grep -q "akubrecah.com"; then
    echo "✅ Success! n8n is now operating on https://n8n.akubrecah.com/"
else
    echo "⚠️ Note: Check if container picked up environment variables. Current response snippet above."
fi

API_KEY="${EVOLUTION_API_KEY:-}"
if [ -z "$API_KEY" ] && [ -f .env ]; then
  API_KEY=$(grep '^EVOLUTION_API_KEY=' .env | cut -d '=' -f2- | tr -d '\r"')
fi

# 5. Update Evolution API webhook to point to the new n8n webhook URL
echo "📱 Pointing Evolution API WhatsApp webhook to n8n.akubrecah.com..."
curl -s -X POST "https://wa.akubrecah.com/webhook/set/akubrecah-kra" \
  -H "Content-Type: application/json" \
  -H "apikey: ${API_KEY}" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "https://n8n.akubrecah.com/webhook/whatsapp-inbound",
      "byEvents": false,
      "events": ["MESSAGES_UPSERT"]
    }
  }' || true

echo ""
echo "🎉 Migration complete! Open https://n8n.akubrecah.com to view your updated webhook URLs."
