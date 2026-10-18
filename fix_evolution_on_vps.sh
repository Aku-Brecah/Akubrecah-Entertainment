#!/usr/bin/env bash
set -e

echo "=========================================="
echo "🔧 Akubrecah VPS - Evolution Bot Fixer"
echo "=========================================="

cd /var/www/akubrecah

echo "1. Pulling latest codebase from origin/main..."
git pull origin main

echo "2. Ensuring REDIS_ENABLED=false in .env if present..."
if [ -f .env ]; then
  sed -i 's/REDIS_ENABLED=true/REDIS_ENABLED=false/g' .env || true
  if ! grep -q "REDIS_ENABLED" .env; then
    echo "REDIS_ENABLED=false" >> .env
  fi
fi

echo "3. Restarting Evolution API container with synchronous dispatch..."
if [ -f deploy/docker-compose.yml ]; then
  docker compose -f deploy/docker-compose.yml up -d --force-recreate evolution akubrecah-app
else
  docker compose up -d --force-recreate evolution akubrecah-app
fi

echo "4. Checking Evolution API container status..."
docker ps --filter "name=evolution"

echo "5. Checking recent Evolution API logs..."
docker logs evolution_api --tail 25 || true

echo "=========================================="
echo "✅ Evolution API reloaded without Redis queue traps!"
echo "=========================================="
