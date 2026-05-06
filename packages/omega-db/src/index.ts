import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | undefined;

/**
 * Singleton Prisma client. Lazy-initialized so unit tests that don't touch
 * the DB don't pay the connection cost.
 */
export const getPrisma = (): PrismaClient => {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }
  return prisma;
};

export type { PrismaClient } from '@prisma/client';
export * from '@prisma/client';
