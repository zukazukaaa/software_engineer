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

## Quickstart

```bash
cp .env.example .env
docker compose up -d        # Postgres (pgvector) + Redis
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

The API listens on `http://localhost:4000`, the console on
`http://localhost:5173`.

## Phases

See the project brief for the full roadmap. The current commit ships Phase 0
foundation + Phase 1 ΩE Core scaffolding (types, layers, engine, registry).

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
