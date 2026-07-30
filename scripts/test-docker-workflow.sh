#!/bin/bash
# Exit immediately if any command fails
set -e

echo "========================================================="
echo "MILITARY HOSPITAL SMART HEALTHCARE (MHSHMS)"
echo "DOCKER DEPLOYMENT & WORKFLOW VALIDATION SCRIPTS"
echo "========================================================="

# 1. Start all docker services
echo "[1/4] Starting database, Redis, AI service, API, and Web containers..."
docker-compose up -d --build

# 2. Wait for API to be ready
echo "[2/4] Verifying network health check..."
TIMEOUT=60
ELAPSED=0
READY=false

while [ $ELAPSED -lt $TIMEOUT ]; do
  if curl -s http://localhost:5001/api/v1 > /dev/null; then
    echo "✔ API service is online and healthy!"
    READY=true
    break
  fi
  echo "Waiting for backend service (elapsed: ${ELAPSED}s)..."
  sleep 2
  let ELAPSED+=2
done

if [ "$READY" = false ]; then
  echo "❌ Error: API service timed out after ${TIMEOUT} seconds."
  docker-compose logs api
  exit 1
fi

# 3. Database migrations & seeding inside container
echo "[3/4] Running schema migrations & data seeding inside the API container..."
docker-compose exec -T api npx prisma migrate deploy
docker-compose exec -T api npx prisma db seed

# 4. Execute test suite
echo "[4/4] Running automated tests inside the API container..."
docker-compose exec -T api npm run test

echo "========================================================="
echo "✔ ALL DOCKER DEPLOYMENT WORKFLOW TESTS PASSED SUCCESSFULLY!"
echo "========================================================="
