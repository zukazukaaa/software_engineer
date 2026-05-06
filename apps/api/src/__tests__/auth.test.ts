import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { InMemoryAuthStore } from '../auth/in-memory-store.js';
import { hashPassword } from '../auth/passwords.js';
import { hashRefreshToken, signRefreshToken, type TokenConfig } from '../auth/tokens.js';
import { NoopRateLimiter } from '../rate-limit/noop.js';
import { buildServer } from '../server.js';

const TEST_TOKEN_CONFIG: TokenConfig = {
  accessSecret: 'test-access-secret',
  refreshSecret: 'test-refresh-secret',
  accessExpiresIn: '15m',
  refreshExpiresIn: '7d',
};

let app: Awaited<ReturnType<typeof buildServer>>;
let authStore: InMemoryAuthStore;

beforeEach(async () => {
  authStore = new InMemoryAuthStore();
  app = await buildServer({
    authStore,
    rateLimiter: new NoopRateLimiter(),
    tokenConfig: TEST_TOKEN_CONFIG,
  });
});

afterEach(async () => {
  await app.close();
});

describe('POST /api/auth/register', () => {
  it('201 on success — returns user + jwt + refreshToken + apiKey', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'alice@example.com', password: 'Secret123' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.user.email).toBe('alice@example.com');
    expect(body.user.tier).toBe('FREE');
    expect(typeof body.jwt).toBe('string');
    expect(typeof body.refreshToken).toBe('string');
    expect(body.apiKey.token.startsWith('omega_')).toBe(true);
    expect(body.apiKey.prefix.startsWith('omega_')).toBe(true);
    expect(body.apiKey.token.length).toBeGreaterThan(body.apiKey.prefix.length);
  });

  it('409 on duplicate email', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'alice@example.com', password: 'Secret123' },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'alice@example.com', password: 'Secret123' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('email_taken');
  });

  it('400 on weak password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'alice@example.com', password: 'short' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await authStore.createUser({
      email: 'bob@example.com',
      passwordHash: await hashPassword('Secret123'),
    });
  });

  it('200 on correct password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'bob@example.com', password: 'Secret123' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.user.email).toBe('bob@example.com');
    expect(typeof body.jwt).toBe('string');
    expect(typeof body.refreshToken).toBe('string');
  });

  it('401 on wrong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'bob@example.com', password: 'WrongPass1' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('invalid_credentials');
  });
});

describe('POST /api/auth/refresh', () => {
  it('200 with valid refresh token issues a new JWT', async () => {
    const reg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'carol@example.com', password: 'Secret123' },
    });
    const { refreshToken } = reg.json();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken },
    });
    expect(res.statusCode).toBe(200);
    expect(typeof res.json().jwt).toBe('string');
  });

  it('401 with expired refresh token', async () => {
    const user = await authStore.createUser({
      email: 'dave@example.com',
      passwordHash: await hashPassword('Secret123'),
    });
    // hand-craft a token that already expired
    const expired = jwt.sign({ sub: user.id, jti: 'x' }, TEST_TOKEN_CONFIG.refreshSecret, {
      expiresIn: '-1s',
    });
    await authStore.setRefreshTokenHash(user.id, hashRefreshToken(expired));
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken: expired },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('invalid_refresh_token');
  });

  it('401 with revoked refresh token (server-side hash mismatch)', async () => {
    const user = await authStore.createUser({
      email: 'eve@example.com',
      passwordHash: await hashPassword('Secret123'),
    });
    const validToken = signRefreshToken(TEST_TOKEN_CONFIG, { sub: user.id, jti: 'old' });
    // Server stored a *different* token's hash, simulating revocation.
    await authStore.setRefreshTokenHash(user.id, 'completely-different-hash');
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken: validToken },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('unauthorized');
  });

  it('200 with valid JWT returns user data', async () => {
    const reg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'frank@example.com', password: 'Secret123' },
    });
    const { jwt: token } = reg.json();
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.email).toBe('frank@example.com');
    expect(body.via).toBe('jwt');
  });
});

describe('API key tier limits', () => {
  it('403 when FREE user tries to create a 2nd key', async () => {
    const reg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'gina@example.com', password: 'Secret123' },
    });
    const { jwt: token } = reg.json();
    // Registration already created 1 key; creating a 2nd should fail for FREE.
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/api-keys',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'second' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe('tier_limit_reached');
  });
});
