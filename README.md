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
