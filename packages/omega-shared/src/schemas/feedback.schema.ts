import { z } from 'zod';

/**
 * Feedback request schema. Posted to /api/omega/reasoning/:id/feedback;
 * feeds the L (Learning) layer.
 */
export const feedbackRequestSchema = z
  .object({
    correct: z.boolean(),
    actualOutcome: z.unknown().optional(),
    notes: z.string().optional(),
  })
  .strict();

export type FeedbackRequest = z.infer<typeof feedbackRequestSchema>;
