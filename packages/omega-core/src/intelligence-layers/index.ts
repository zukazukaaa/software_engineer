import { AI } from './ai.js';
import { Context } from './context.js';
import { Experience } from './experience.js';
import { Human } from './human.js';
import { Information } from './information.js';
import { Knowledge } from './knowledge.js';
import { Learning } from './learning.js';
import { Nature } from './nature.js';
import { Observation } from './observation.js';
import { Probability } from './probability.js';
import { Science } from './science.js';
import type {
  IntelligenceLayer,
  IntelligenceLayerKey,
  NexusLayer,
  NexusLayerKey,
} from '../types.js';

export { Knowledge, Information, Observation, Context, Experience, Probability, Learning };
export { Human, Nature, Science, AI };

export const DEFAULT_INTELLIGENCE_LAYERS: Record<
  IntelligenceLayerKey,
  IntelligenceLayer
> = {
  K: new Knowledge(),
  I: new Information(),
  O: new Observation(),
  C: new Context(),
  E: new Experience(),
  P: new Probability(),
  L: new Learning(),
};

export const DEFAULT_NEXUS_LAYERS: Record<NexusLayerKey, NexusLayer> = {
  H: new Human(),
  N: new Nature(),
  S: new Science(),
  AI: new AI(),
};
