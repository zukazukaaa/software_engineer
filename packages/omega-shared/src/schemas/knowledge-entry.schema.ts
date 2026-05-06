import { z } from 'zod';

/**
 * Knowledge-entry write schema. Used by /api/layers/knowledge to add a row
 * into the persisted knowledge base. Distinct from `knowledgeLayerSchema`
 * which validates the K-layer payload sent into reasoning.
 */
export const knowledgeEntrySchema = z
  .object({
    domainId: z.string().min(1),
    type: z.enum(['fact', 'rule', 'pattern', 'law']),
    content: z.string().min(1),
    source: z.string().optional(),
  })
  .strict();

export type KnowledgeEntryInput = z.infer<typeof knowledgeEntrySchema>;
