import { createHash, randomBytes } from 'node:crypto';

const KEY_PREFIX = 'omega_';
/** Number of base64url chars from the start of the key used as a public prefix. */
const VISIBLE_CHARS = 4;

/**
 * Generate a fresh API key.
 *
 * The plaintext (`token`) is returned exactly once — it is shown to the
 * user and never persisted. Only `hashedKey` (SHA-256) is stored. The
 * `prefix` is a short visible identifier ("omega_aBcD") shown in the UI to
 * help users recognize keys without revealing them.
 */
export const generateApiKey = (): { token: string; hashedKey: string; prefix: string } => {
  const raw = randomBytes(32).toString('base64url');
  const token = `${KEY_PREFIX}${raw}`;
  const hashedKey = hashApiKey(token);
  const prefix = `${KEY_PREFIX}${raw.slice(0, VISIBLE_CHARS)}`;
  return { token, hashedKey, prefix };
};

/** SHA-256 of the raw token. Constant-time-equivalent because we look up by hash. */
export const hashApiKey = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export const isApiKeyToken = (header: string | undefined): header is string =>
  typeof header === 'string' && header.startsWith(KEY_PREFIX);
