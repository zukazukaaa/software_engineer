#!/usr/bin/env bash
# Integration test driver.
#
# Spins up docker-compose.test.yml (Postgres on 5433, Redis on 6380),
# applies prisma migrations to the test DB, runs the integration suite,
# and tears the compose down — always, even on failure (trap EXIT).
#
# Idempotent and safe to re-run: `down -v` wipes test volumes each run.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="docker-compose.test.yml"
TEST_DB_URL="postgresql://omega:omega_test@localhost:5433/omega_test?schema=public"
TEST_REDIS_URL="redis://localhost:6380"

cleanup() {
  echo "→ tearing down test compose"
  docker compose -f "$COMPOSE_FILE" down -v --remove-orphans >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

echo "→ bringing up test services"
docker compose -f "$COMPOSE_FILE" up -d

echo "→ waiting for services to be healthy"
for i in $(seq 1 30); do
  pg_status=$(docker inspect --format='{{.State.Health.Status}}' omega-postgres-test 2>/dev/null || echo unknown)
  redis_status=$(docker inspect --format='{{.State.Health.Status}}' omega-redis-test 2>/dev/null || echo unknown)
  if [ "$pg_status" = "healthy" ] && [ "$redis_status" = "healthy" ]; then
    echo "  pg=healthy redis=healthy"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "  timed out waiting for healthchecks (pg=$pg_status redis=$redis_status)"
    exit 1
  fi
  sleep 1
done

echo "→ applying migrations to test DB"
DATABASE_URL="$TEST_DB_URL" npm run db:deploy -w @omega/db

echo "→ running integration suite"
DATABASE_URL="$TEST_DB_URL" \
REDIS_URL="$TEST_REDIS_URL" \
NODE_ENV="test" \
JWT_SECRET="integration-test-jwt" \
JWT_REFRESH_SECRET="integration-test-refresh" \
REDIS_FAIL_MODE="closed" \
INTEGRATION=1 \
npx --workspace @omega/api vitest run --config vitest.integration.config.ts

echo "→ done"
