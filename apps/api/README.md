# @omega/api

Fastify backend for the ΩE platform.

## Routes

| Method | Path | Auth |
| ------ | ---- | ---- |
| GET    | `/health`                        | public — liveness only (process up) |
| GET    | `/health/ready`                  | public — readiness; checks DB + Redis, 503 if either is down |
| GET    | `/api/layers`, `/api/layers/:n`  | public |
| POST   | `/api/auth/register`             | public |
| POST   | `/api/auth/login`                | public |
| POST   | `/api/auth/refresh`              | public |
| GET    | `/api/auth/me`                   | Bearer or x-api-key |
| GET    | `/api/auth/api-keys`             | Bearer or x-api-key |
| POST   | `/api/auth/api-keys`             | Bearer or x-api-key |
| DELETE | `/api/auth/api-keys/:id`         | Bearer or x-api-key |
| POST   | `/api/omega/reason`              | Bearer or x-api-key |
| POST   | `/api/omega/reason/:domain`      | Bearer or x-api-key |
| GET    | `/api/domains`, `/api/domains/:n/health` | Bearer or x-api-key |

`/health` is intended for k8s/ECS **liveness probes** — it is dependency-
independent and returns 200 as long as the process is alive.

`/health/ready` is intended for **readiness probes**. It pings Postgres
(`SELECT 1`) and Redis (`PING`), reports per-dependency latency, and
returns 503 if either is down. Use this for load-balancer health checks
so traffic stops when the back-end is degraded.

## Environment

Configuration is read from `process.env`, validated by
`src/config/env.ts` (Zod) at boot. Invalid env exits the process with a
non-zero code and logs every offending field.

### Dev: auto-load from `.env`

`src/bootstrap-env.ts` is the first import in `src/server.ts`. When
`NODE_ENV !== 'production'` it reads the project-root `.env` and
populates `process.env` *before* anything else runs. No need to
`set -a; source .env`.

### Prod: caller injects

`NODE_ENV=production` skips the dotenv load entirely. Inject vars via
Docker / systemd / k8s.

## Tests

Two passes, distinct configs.

### Unit (mocks, no services needed)

```bash
npm run test:unit -w @omega/api
```

Stubs are injected via `src/__tests__/_setup.ts` (vitest setupFile) so
`config/env.ts` validates against placeholder values without touching a
real DB or Redis. All existing routes are covered with Fastify
`inject()`.

### Integration (real Postgres + Redis)

```bash
# from repo root
npm run test:integration
```

Driven by `scripts/test-integration.sh`:

1. `docker compose -f docker-compose.test.yml up -d` (Postgres 5433, Redis 6380)
2. waits for healthchecks
3. `prisma migrate deploy` against the test DB
4. `vitest run --config vitest.integration.config.ts`
5. `docker compose down -v --remove-orphans` (always, via `trap EXIT`)

Coverage:

| File | What |
| ---- | ---- |
| `test/integration/auth.test.ts`         | register persists rows; login → bearer → `/api/omega/reason` |
| `test/integration/rate-limit.test.ts`   | counter shows in Redis; 429 with `Retry-After` after 100/h |
| `test/integration/health.test.ts`       | `/health/ready` 200 with deps up; 503 with Redis down |
| `test/integration/vector.test.ts`       | pgvector cosine query returns the right nearest neighbour |

`test/integration/setup.ts` exposes `getTestApp()`, `getTestPrisma()`,
`getTestRedis()`, `truncateAll()` (between-tests reset), and
`setupIntegration()` which wires `beforeAll` / `beforeEach` / `afterAll`.

## Local boot

```bash
docker compose up -d           # Postgres + Redis (dev compose)
npm run db:deploy -w @omega/db
npm run db:seed -w @omega/db   # admin@omega.local / OmegaAdmin123!  (CHANGE BEFORE PROD)
npm run dev -w @omega/api
```
