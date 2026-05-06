/**
 * apps/api dev-only environment bootstrap.
 *
 * Loaded as the FIRST import in `server.ts`. ESM evaluates each `import`
 * statement (and its side effects) in declaration order before the
 * importing module's body runs, so `process.env` is populated by the time
 * `./config.js` parses it.
 *
 * Production (`NODE_ENV === 'production'`) skips dotenv entirely — env
 * vars must be injected by the host (Docker, systemd, k8s, ...).
 *
 * Path: project root `.env`. Resolved relative to this file so it works
 * regardless of the current working directory.
 *
 *   apps/api/src/bootstrap-env.ts  →  ../../../.env  (root)
 *
 * The same offset is correct for the compiled file
 * (apps/api/dist/bootstrap-env.js) because dist mirrors src — but in
 * production we don't load anyway.
 *
 * Default dotenv behaviour (no override) is intentional: explicit env
 * vars from the shell or process supervisor still win, so the production
 * code path is unchanged even if a stray `.env` exists.
 */

import { config as loadDotenv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

if (process.env.NODE_ENV !== 'production') {
  const here = dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(here, '..', '..', '..', '.env');
  loadDotenv({ path: envPath });
}
