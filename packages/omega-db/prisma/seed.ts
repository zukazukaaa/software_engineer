/**
 * Dev/test seed script.
 *
 *   ENTERPRISE admin user: admin@omega.local / OmegaAdmin123!
 *   One example Domain row ('mock')
 *
 * Idempotent — uses upsert so repeated `prisma db seed` runs are safe.
 *
 * IMPORTANT: change the password before any deployment that's reachable
 * from a non-trusted network. The default is for local development only.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@omega.local';
const ADMIN_PASSWORD = 'OmegaAdmin123!';
const ADMIN_TIER = 'ENTERPRISE';

const main = async () => {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const admin = await prisma.userAuth.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      email: ADMIN_EMAIL,
      passwordHash,
      tier: ADMIN_TIER,
    },
    update: {
      passwordHash,
      tier: ADMIN_TIER,
    },
  });

  const mockDomain = await prisma.domain.upsert({
    where: { name: 'mock' },
    create: {
      name: 'mock',
      version: '0.1.0',
      config: { description: 'In-memory MockDomain registered by apps/api' },
      active: true,
    },
    update: {},
  });

  // eslint-disable-next-line no-console
  console.log('seeded:', {
    user: { id: admin.id, email: admin.email, tier: admin.tier },
    domain: { id: mockDomain.id, name: mockDomain.name },
  });
};

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
