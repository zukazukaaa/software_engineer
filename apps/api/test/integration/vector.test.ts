import { describe, expect, it } from 'vitest';
import { getTestPrisma, setupIntegration } from './setup.js';

setupIntegration();

const VEC_DIM = 1536;

const formatVector = (values: number[]): string => `[${values.join(',')}]`;

const oneHot = (index: number): number[] => {
  const v = new Array<number>(VEC_DIM).fill(0);
  v[index] = 1;
  return v;
};

describe('Integration: pgvector cosine similarity on KnowledgeEntry', () => {
  it('inserts embeddings and returns the right nearest neighbour', async () => {
    const prisma = await getTestPrisma();

    const domain = await prisma.domain.create({
      data: { name: 'vector-test', version: '0.0.1', config: {}, active: true },
    });

    const a = oneHot(0); //   [1, 0, 0, ...]
    const b = oneHot(1); //   [0, 1, 0, ...]
    const c = oneHot(2); //   [0, 0, 1, ...]
    const query = oneHot(0); // closest to `a`

    // Embeddings go in via raw SQL — Prisma's typed insert path doesn't
    // support pgvector columns, but UPDATE with ::vector works.
    const insert = async (content: string, vec: number[]) => {
      const row = await prisma.knowledgeEntry.create({
        data: { domainId: domain.id, type: 'fact', content },
      });
      await prisma.$executeRawUnsafe(
        `UPDATE "KnowledgeEntry" SET embedding = $1::vector WHERE id = $2`,
        formatVector(vec),
        row.id,
      );
      return row;
    };

    const rowA = await insert('alpha', a);
    await insert('beta', b);
    await insert('gamma', c);

    // <=> is pgvector's cosine distance operator (lower = more similar).
    const result = await prisma.$queryRawUnsafe<Array<{ id: string; content: string; distance: number }>>(
      `SELECT id, content, embedding <=> $1::vector AS distance
         FROM "KnowledgeEntry"
         WHERE "domainId" = $2
         ORDER BY distance ASC
         LIMIT 1`,
      formatVector(query),
      domain.id,
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(rowA.id);
    expect(result[0]!.content).toBe('alpha');
    // Cosine distance to an identical vector is 0.
    expect(Number(result[0]!.distance)).toBeLessThan(1e-6);
  });
});
