/**
 * DomainAdapter — the only interface a plug-in needs to implement.
 *
 * The ΩE Core never knows what a domain *is*; it only knows that an adapter
 * supplies four kinds of payload (K/O/C/P) and can reformat the engine's
 * generic output for its own consumers.
 */

export type {
  DomainAdapter,
  KnowledgeLayer,
  ObservationLayer,
  ContextLayer,
  ProbabilityLayer,
  OmegaOutput,
} from '../types.js';
