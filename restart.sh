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
git pull origin main

echo "4. Starting clean production stack..."
docker compose up -d

echo "5. Verifying running containers..."
sleep 4
docker compose ps

echo ""
echo "=========================================="
echo "✅ All containers started successfully!"
echo "=========================================="
