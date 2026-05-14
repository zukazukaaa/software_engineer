import { describe, expect, it } from 'vitest';
import { getTestApp, getTestPrisma, setupIntegration } from './setup.js';

setupIntegration();

describe('Integration: auth against real Postgres', () => {
  it('register persists a UserAuth + ApiKey row', async () => {
    const app = await getTestApp();
    const prisma = await getTestPrisma();

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'integration@example.com', password: 'Secret123' },
    });
    expect(res.statusCode).toBe(201);

    const userRow = await prisma.userAuth.findUnique({
      where: { email: 'integration@example.com' },
    });
    expect(userRow).not.toBeNull();
    expect(userRow!.tier).toBe('FREE');

    const keyCount = await prisma.apiKey.count({ where: { userId: userRow!.id } });
    expect(keyCount).toBe(1);
  });

  it('login then call /api/omega/reason with bearer token works end-to-end', async () => {
    const app = await getTestApp();

    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'flow@example.com', password: 'Secret123' },
    });

    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'flow@example.com', password: 'Secret123' },
    });
    expect(login.statusCode).toBe(200);
    const token = login.json().jwt as string;

    const reason = await app.inject({
      method: 'POST',
      url: '/api/omega/reason',
      headers: { authorization: `Bearer ${token}` },
      payload: { query: 'integration', domain: 'mock', layers: {} },
    });
    expect(reason.statusCode).toBe(200);
    expect(reason.json().reasoning).toHaveLength(11);
  });

  it('duplicate email rejected by the unique index', async () => {
    const app = await getTestApp();
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'dupe@example.com', password: 'Secret123' },
    });
    const second = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'dupe@example.com', password: 'Secret123' },
    });
    expect(second.statusCode).toBe(409);
  });
});
