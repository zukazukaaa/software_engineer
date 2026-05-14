# ΩE Core — Omega Emergence Universal Intelligence Platform

> *From uncertainty toward truth.*

ΩE is a **domain-agnostic reasoning root**. The core engine never knows about
specific domains; domains plug in as adapters and inherit the full Ω → ΩN → ΩE
pipeline.

## Fundamental laws

```
Ω  = lim_{U→0}(K × I × O × C × E × P × L)
ΩN = (H + N + S + AI) × Ω
ΩE = ΩN − Ω
```

| Symbol | Meaning |
| ------ | ------- |
| K | Knowledge |
| I | Information |
| O | Observation |
| C | Context |
| E | Experience |
| P | Probability |
| L | Learning |
| H | Human reasoning |
| N | Nature logic |
| S | Scientific method |
| AI | Artificial intelligence |
| U | Uncertainty (target → 0) |

## Repository layout

```
omega-emergence/
├── apps/
│   ├── api/            Fastify backend
│   └── console/        React + Vite frontend
├── packages/
│   ├── omega-core/     IMMUTABLE — ΩE engine, layers, registry
│   ├── omega-db/       Prisma schema + client
│   └── omega-shared/   Shared types and utilities
├── domains/            MUTABLE — domain plug-ins (empty by design)
├── docker-compose.yml
├── turbo.json
└── package.json
```

`packages/omega-core/` and `packages/omega-db/schema.prisma` are the immutable
root. Domains are mutable branches.

## Quick start

```bash
git clone <this-repo> && cd software_engineer
cp .env.example .env
npm install                 # also runs prisma generate (postinstall)
docker compose up -d        # Postgres (pgvector) + Redis
npm run db:deploy           # apply migrations to the dev DB
npm run db:seed             # one ENTERPRISE admin + the mock domain
npm run dev                 # API on :4000, console on :5173
```

After `npm run dev` is running:

```bash
curl http://localhost:4000/health         # liveness  → 200
curl http://localhost:4000/health/ready   # readiness → 200 with db+redis ok
```

## Architecture overview

```
omega-emergence/
├── apps/
│   ├── api/            Fastify backend  (auth, /api/omega/reason, health)
│   └── console/        React + Vite frontend
├── packages/
│   ├── omega-core/     IMMUTABLE — ΩE engine, layers, registry
│   ├── omega-db/       Prisma schema + Postgres client (pgvector)
│   └── omega-shared/   Zod schemas + tier constants
├── domains/            MUTABLE — domain plug-ins (empty by design)
├── docker-compose.yml      Dev services (Postgres 5432, Redis 6379)
├── docker-compose.test.yml Test-only services (Postgres 5433, Redis 6380)
└── scripts/test-integration.sh
```

`packages/omega-core/{reasoning-engine,intelligence-layers,domain-registry}/` and
`packages/omega-core/src/types.ts` are the immutable root (CODEOWNERS +
Husky + CI gate). Domains are mutable branches.

## Environment variables

| Var | Required | Default | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | yes | `development` | `development` \| `production` \| `test` |
| `DATABASE_URL` | yes | — | matches docker-compose service `postgres` |
| `REDIS_URL` | yes | — | matches docker-compose service `redis` |
| `REDIS_FAIL_MODE` | no | `closed` | `open` (allow on outage) \| `closed` (503 on outage) |
| `JWT_SECRET` | yes | — | ≥32 random bytes in prod |
| `JWT_REFRESH_SECRET` | yes | — | ≥32 random bytes in prod |
| `JWT_EXPIRES_IN` | no | `15m` | jsonwebtoken duration |
| `JWT_REFRESH_EXPIRES_IN` | no | `7d` | jsonwebtoken duration |
| `API_HOST` | no | `0.0.0.0` | |
| `API_PORT` | no | `4000` | |
| `LOG_LEVEL` | no | `info` | pino level |

`apps/api/src/config/env.ts` validates these at boot; on failure it logs
every issue and exits 1.

## Running tests

```bash
npm run test:unit            # vitest with mocks; needs no services
npm run test:integration     # spins up docker-compose.test.yml,
                             # applies migrations, runs the suite,
                             # tears down — driven by scripts/test-integration.sh
```

`npm run test` runs the unit pass via Turbo. Integration tests are not in
the default `test` task because they need Docker and ports 5433/6380.

## Troubleshooting

- **`prisma generate` fails on install** — the `postinstall` in `@omega/db`
  expects the Prisma CLI; if `npm install` was interrupted, re-run it.
- **`docker compose up -d` fails with port conflict** — check whether you
  already have a Postgres/Redis on 5432/6379 (or 5433/6380 for the test
  compose). Stop them or remap ports in compose.
- **`/health/ready` returns 503** — inspect the `checks` field; one of
  `db.error` or `redis.error` will name the failure. Most often DATABASE_URL
  or REDIS_URL points at the wrong host/port.
- **Tests can't find the Prisma client** — run `npm run db:generate` from
  the repo root. CI should run this before `test`.
- **Husky hook blocking your commit** — see *Core Protection* below.

## Phases

Phase 0/1 foundation + Phase 1 auth/rate-limit + Sprint A real services.
See the project brief for the full roadmap.

## Core Protection

ΩE Core is **immutable by intent**: the engine, the 11 layers, the registry,
and the public type contracts implement the laws Ω → ΩN → ΩE that every
domain plug-in inherits. Casual edits to those files break every plug-in
silently. Protection is layered:

| Layer | What it blocks | Bypass |
| ----- | -------------- | ------ |
| `.github/CODEOWNERS`                       | merging without owner approval | rewrite CODEOWNERS in a separate PR |
| Local `.husky/commit-msg` hook             | committing locally             | `--no-verify` (or one of the two intentional unlocks below) |
| `.github/workflows/core-protection.yml`    | merging via PR (incl. fork / web editor) | one of the two unlocks below; check is required on `main` |

### Protected paths

```
packages/omega-core/src/reasoning-engine/
packages/omega-core/src/intelligence-layers/
packages/omega-core/src/domain-registry/
packages/omega-core/src/types.ts
```

### Two ways to unlock a deliberate change

a) **Stage `MIGRATION.md`** describing the breaking change and migration path
   alongside your code change:

   ```bash
   $EDITOR MIGRATION.md
   git add MIGRATION.md packages/omega-core/...
   git commit -m "rework Ω product semantics"
   ```

b) **Tag the PR description / commit message with `[CORE-MIGRATION]`**:

   ```bash
   git commit -m "[CORE-MIGRATION] rework Ω product semantics

   ΩN now divides Ω instead of multiplying. Backwards-incompatible..."
   ```

The local hook reads the commit message; CI reads the PR description. Both
must contain the literal `[CORE-MIGRATION]` tag, or `MIGRATION.md` must be
included.

### Why this is friction, not security

Anyone with write access can bypass the local hook with `--no-verify`. The
point is not to prevent malicious edits — it is to make a developer pause
and consider whether they are about to ship a behaviour change to every
domain plug-in. From the ΩE law: "from uncertainty toward truth — core
stability is part of that". A change to the root is a change to every
branch; that should never be accidental.

### Setup

The local hook is wired up automatically by `npm install`'s `prepare`
script (Husky v9). Fresh clones get the hook on first install. Container
builds without a `.git` directory degrade silently — `prepare` is
defensive (`husky || true`).
