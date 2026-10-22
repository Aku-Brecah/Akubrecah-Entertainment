#!/usr/bin/env bash
set -e

echo "=========================================="
echo "🔧 Akubrecah VPS - Evolution Bot Fixer"
echo "=========================================="

cd /var/www/akubrecah

echo "1. Pulling latest codebase from origin/main..."
git pull origin main

echo "2. Ensuring REDIS & CACHE variables are disabled in .env..."
if [ -f .env ]; then
  sed -i 's/REDIS_ENABLED=true/REDIS_ENABLED=false/g' .env || true
  sed -i 's/CACHE_REDIS_ENABLED=true/CACHE_REDIS_ENABLED=false/g' .env || true
  if ! grep -q "REDIS_ENABLED" .env; then
    echo "REDIS_ENABLED=false" >> .env
  fi
  if ! grep -q "CACHE_REDIS_ENABLED" .env; then
    echo "CACHE_REDIS_ENABLED=false" >> .env
  fi
  if ! grep -q "CONFIG_SESSION_PHONE_VERSION" .env; then
    echo "CONFIG_SESSION_PHONE_VERSION=2.3000.1020885143" >> .env
  fi
fi

echo "3. Pulling updated Evolution API Docker image..."
docker pull evoapicloud/evolution-api:latest || true

echo "4. Recreating Evolution API and App containers..."
if [ -f deploy/docker-compose.yml ]; then
  docker compose -f deploy/docker-compose.yml up -d --force-recreate evolution akubrecah-app
else
  docker compose up -d --force-recreate evolution akubrecah-app
fi

echo "5. Checking Evolution API container status..."
docker ps --filter "name=evolution"

echo "6. Checking recent Evolution API logs..."
sleep 3
docker logs evolution_api --tail 30 || true

echo "=========================================="
echo "✅ Evolution API reloaded and updated successfully!"
echo "=========================================="
