import { z } from 'zod';

/**
 * L — Learning layer.
 * Past feedback accuracy (engine self-trust) plus pending adjustments.
 */

export const feedbackSummarySchema = z
  .object({
    correct: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
    /** correct / total — clients may compute or let derived consumers. */
    accuracy: z.number().min(0).max(1),
  })
  .strict()
  .refine((s) => s.correct <= s.total, {
    message: 'feedback.correct cannot exceed feedback.total',
    path: ['correct'],
  });

export const learningAdjustmentSchema = z
  .object({
    /** Target identifier (layer key, rule id, parameter path, ...). */
    target: z.string().min(1),
    /** Signed delta to apply. */
    delta: z.number(),
    rationale: z.string().min(1),
  })
  .strict();

export const learningLayerSchema = z
  .object({
    feedback: feedbackSummarySchema,
    adjustments: z.array(learningAdjustmentSchema),
  })
  .strict();

export type FeedbackSummaryInput = z.infer<typeof feedbackSummarySchema>;
export type LearningAdjustmentInput = z.infer<typeof learningAdjustmentSchema>;
export type LearningLayerInput = z.infer<typeof learningLayerSchema>;
