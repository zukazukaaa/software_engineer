/**
 * Strict Zod schemas for every public payload boundary.
 *
 * Layer schemas (one per file, mirroring packages/omega-core/src/types.ts):
 *   K  knowledge.schema.ts
 *   I  information.schema.ts
 *   O  observation.schema.ts
 *   C  context.schema.ts
 *   E  experience.schema.ts
 *   P  probability.schema.ts
 *   L  learning.schema.ts
 *   H  human.schema.ts
 *   N  nature.schema.ts
 *   S  science.schema.ts
 *   AI ai.schema.ts
 *
 * Aggregate: omega-input.schema.ts
 * Side schemas: feedback.schema.ts, knowledge-entry.schema.ts
 */

export * from './knowledge.schema.js';
export * from './information.schema.js';
export * from './observation.schema.js';
export * from './context.schema.js';
export * from './experience.schema.js';
export * from './probability.schema.js';
export * from './learning.schema.js';
export * from './human.schema.js';
export * from './nature.schema.js';
export * from './science.schema.js';
export * from './ai.schema.js';

export * from './omega-input.schema.js';
export * from './feedback.schema.js';
export * from './knowledge-entry.schema.js';
export * from './auth.schema.js';
