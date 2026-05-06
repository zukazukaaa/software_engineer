# @omega/db

Prisma schema + client for the ΩE root.

The schema is **part of the immutable core** — domain-agnostic. Domain plug-ins
write into `Domain`, `Reasoning`, `KnowledgeEntry`, `Experience`, and
`Feedback`, but they never alter the schema.

## Migration

```bash
DATABASE_URL=... npm run db:migrate -w @omega/db
```

The schema requires the `pgvector` extension (already enabled in
`docker-compose.yml`).
