/**
 * ΩE Core type contracts.
 *
 * Laws:
 *   Ω  = lim_{U→0}(K × I × O × C × E × P × L)
 *   ΩN = (H + N + S + AI) × Ω
 *   ΩE = ΩN − Ω
 */

// ─────────────────────────────────────────────────────────────────────────────
// Layer payload shapes
// ─────────────────────────────────────────────────────────────────────────────

export interface KnowledgeLayer {
  facts: KnowledgeFact[];
  rules: KnowledgeRule[];
  source?: string;
}

export interface KnowledgeFact {
  id: string;
  statement: string;
  weight: number; // 0..1 confidence in this fact
  embedding?: number[];
}

export interface KnowledgeRule {
  id: string;
  when: string;
  then: string;
  weight: number;
}

export interface InformationLayer {
  raw: unknown;
  normalized: Record<string, unknown>;
  signals: InformationSignal[];
}

export interface InformationSignal {
  key: string;
  value: unknown;
  confidence: number; // 0..1
}

export interface ObservationLayer {
  observations: Observation[];
  source: string;
  capturedAt: Date;
}

export interface Observation {
  id: string;
  channel: string; // 'sensor', 'feed', 'manual', etc.
  value: unknown;
  reliability: number; // 0..1
}

export interface ContextLayer {
  domain: string;
  scope: Record<string, unknown>;
  constraints: ContextConstraint[];
}

export interface ContextConstraint {
  key: string;
  operator: '=' | '!=' | '<' | '>' | 'in' | 'between';
  value: unknown;
}

export interface ExperienceLayer {
  patterns: ExperiencePattern[];
}

export interface ExperiencePattern {
  id: string;
  description: string;
  weight: number;
  outcome: unknown;
  similarity?: number; // populated after vector search
}

export interface ProbabilityLayer {
  distributions: ProbabilityDistribution[];
}

export interface ProbabilityDistribution {
  variable: string;
  outcomes: Array<{ value: unknown; p: number }>;
}

export interface LearningLayer {
  feedback: FeedbackSummary;
  adjustments: LearningAdjustment[];
}

export interface FeedbackSummary {
  correct: number;
  total: number;
  accuracy: number; // correct / total
}

export interface LearningAdjustment {
  target: string;
  delta: number;
  rationale: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Nexus layers
// ─────────────────────────────────────────────────────────────────────────────

export interface HumanLayer {
  reasoning: string;
  hypotheses: string[];
  weight: number;
}

export interface NatureLayer {
  laws: string[]; // 'gravity', 'thermodynamics', 'evolution', ...
  invariants: Record<string, unknown>;
}

export interface ScienceLayer {
  frameworks: string[]; // 'bayesian', 'falsifiability', 'control-experiment'
  citations: ScienceCitation[];
}

export interface ScienceCitation {
  title: string;
  url?: string;
  weight: number;
}

export interface AILayer {
  models: AIModelInvocation[];
}

export interface AIModelInvocation {
  provider: 'anthropic' | 'openai' | 'gemini' | 'mock';
  model: string;
  output: string;
  confidence: number; // self-reported or post-hoc
  cost?: number;
  latencyMs?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Aggregate inputs
// ─────────────────────────────────────────────────────────────────────────────

export interface IntelligenceLayers {
  K: KnowledgeLayer;
  I: InformationLayer;
  O: ObservationLayer;
  C: ContextLayer;
  E: ExperienceLayer;
  P: ProbabilityLayer;
  L: LearningLayer;
}

export interface NexusLayers {
  H: HumanLayer;
  N: NatureLayer;
  S: ScienceLayer;
  AI: AILayer;
}

export type IntelligenceLayerKey = keyof IntelligenceLayers;
export type NexusLayerKey = keyof NexusLayers;
export type AnyLayerKey = IntelligenceLayerKey | NexusLayerKey;

export const INTELLIGENCE_KEYS: readonly IntelligenceLayerKey[] = [
  'K',
  'I',
  'O',
  'C',
  'E',
  'P',
  'L',
] as const;

export const NEXUS_KEYS: readonly NexusLayerKey[] = ['H', 'N', 'S', 'AI'] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Engine I/O
// ─────────────────────────────────────────────────────────────────────────────

export interface OmegaInput {
  query: string;
  domain: string;
  layers: Partial<IntelligenceLayers>;
  nexus?: Partial<NexusLayers>;
  options?: OmegaOptions;
}

export interface OmegaOptions {
  /** Skip layers explicitly even if data is provided. */
  disableLayers?: AnyLayerKey[];
  /** Cap reasoning latency, ms. */
  timeoutMs?: number;
  /** Trace verbosity for the reasoning chain. */
  trace?: 'minimal' | 'standard' | 'verbose';
}

export interface ReasoningStep {
  layer: AnyLayerKey;
  input: unknown;
  output: unknown;
  uncertaintyBefore: number;
  uncertaintyAfter: number;
  uncertaintyDelta: number;
  reasoning: string;
  durationMs: number;
}

export interface Alternative {
  decision: unknown;
  confidence: number;
  rationale: string;
}

export interface EmergencePattern {
  /** Insight present in ΩN but absent from raw Ω — i.e. ΩN − Ω. */
  novelInsights: string[];
  /** Tension between Ω and ΩN that hints at hidden structure. */
  tensions: string[];
  /** Magnitude of the emergent gap (normalized 0..1). */
  magnitude: number;
}

export interface OmegaResult {
  /** Product of intelligence-layer signals. */
  product: number;
  uncertainty: number;
  contributions: Record<IntelligenceLayerKey, LayerContribution | undefined>;
}

export interface NexusResult {
  /** Sum of nexus-layer signals, multiplied with Ω. */
  amplified: number;
  uncertainty: number;
  contributions: Record<NexusLayerKey, LayerContribution | undefined>;
}

export interface LayerContribution {
  signal: number; // 0..1 how strongly this layer pushed toward a decision
  uncertainty: number; // 0..1 the layer's residual uncertainty
  notes: string;
}

export interface OmegaOutput {
  decision: unknown;
  uncertainty: number; // U: 0..1, 0 = full truth
  confidence: number; // 1 - U
  reasoning: ReasoningStep[];
  alternatives: Alternative[];
  emergence: EmergencePattern;
  metadata: {
    domain: string;
    timestamp: Date;
    layersUsed: AnyLayerKey[];
    cost: number;
    latency: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer runtime contracts
// ─────────────────────────────────────────────────────────────────────────────

export interface LayerExecutionContext {
  query: string;
  domain: string;
  /** Read-only view of all layer payloads available so far. */
  layers: Partial<IntelligenceLayers>;
  nexus: Partial<NexusLayers>;
  /** Current uncertainty before this layer fires. */
  uncertainty: number;
}

export interface IntelligenceLayer<K extends IntelligenceLayerKey = IntelligenceLayerKey> {
  readonly key: K;
  readonly version: string;
  process(
    payload: IntelligenceLayers[K] | undefined,
    ctx: LayerExecutionContext,
  ): Promise<LayerContribution>;
}

export interface NexusLayer<K extends NexusLayerKey = NexusLayerKey> {
  readonly key: K;
  readonly version: string;
  process(
    payload: NexusLayers[K] | undefined,
    ctx: LayerExecutionContext,
    omega: OmegaResult,
  ): Promise<LayerContribution>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain adapter
// ─────────────────────────────────────────────────────────────────────────────

export interface DomainAdapter {
  readonly name: string;
  readonly version: string;

  loadKnowledge(): Promise<KnowledgeLayer>;
  getObservations(query: string): Promise<ObservationLayer>;
  buildContext(query: string): Promise<ContextLayer>;
  buildProbabilityModel(data: unknown): Promise<ProbabilityLayer>;

  formatOutput(omegaOutput: OmegaOutput): unknown;
}
