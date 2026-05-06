import { OmegaEngine, MockDomain } from '@omega/core';

/**
 * Singleton ΩE engine. The mock domain is registered for development;
 * real plug-ins replace it.
 */
export const omegaEngine = new OmegaEngine();
omegaEngine.registerDomain(new MockDomain());
