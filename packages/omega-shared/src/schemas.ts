import { z } from 'zod';

/**
 * Wire-format Zod schemas for API validation. The TS types in @omega/core are
 * the source of truth; these mirror them at runtime.
 */

export const reasonRequestSchema = z.object({
  query: z.string().min(1),
  domain: z.string().min(1),
  layers: z.record(z.unknown()).default({}),
  nexus: z.record(z.unknown()).optional(),
  options: z
    .object({
      disableLayers: z.array(z.string()).optional(),
      timeoutMs: z.number().int().positive().optional(),
      trace: z.enum(['minimal', 'standard', 'verbose']).optional(),
    })
    .optional(),
});

export type ReasonRequest = z.infer<typeof reasonRequestSchema>;

export const feedbackRequestSchema = z.object({
  correct: z.boolean(),
  actualOutcome: z.unknown().optional(),
  notes: z.string().optional(),
});

export type FeedbackRequest = z.infer<typeof feedbackRequestSchema>;

export const knowledgeEntrySchema = z.object({
  domainId: z.string(),
  type: z.enum(['fact', 'rule', 'pattern', 'law']),
  content: z.string().min(1),
  source: z.string().optional(),
});

export type KnowledgeEntryInput = z.infer<typeof knowledgeEntrySchema>;
