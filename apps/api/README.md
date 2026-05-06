# @omega/api

Fastify backend for the ΩE platform.

## Routes

| Method | Path | Auth |
| ------ | ---- | ---- |
| GET    | `/health`                        | public |
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

## Environment

Configuration is read from `process.env` and parsed by `src/config.ts`.

### Dev: auto-load from `.env`

`src/bootstrap-env.ts` is the first import in `src/server.ts`. When
`NODE_ENV !== 'production'` it reads the project-root `.env` and populates
`process.env` *before* anything else runs. No need to `set -a; source .env`
for `npm run dev`.

dotenv runs with default semantics (no override), so any var already set
in the shell wins.

```bash
cp .env.example .env   # at the repo root
npm run dev -w @omega/api
```

### Prod: caller injects

When `NODE_ENV === 'production'`, the bootstrap is a no-op — `dotenv` is
not even loaded. Inject vars via Docker / systemd / k8s.

```bash
NODE_ENV=production node apps/api/dist/server.js
```

## Test

```bash
npm test -w @omega/api
```

Tests use `InMemoryAuthStore` and `NoopRateLimiter` injected via
`buildServer({ authStore, rateLimiter, tokenConfig })`, so they need
neither Postgres nor Redis.
