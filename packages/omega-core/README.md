# @omega/core

**IMMUTABLE.** This package is the ΩE reasoning root. It does not know about
any specific domain.

Modifying anything in `src/reasoning-engine/` or `src/intelligence-layers/`
requires a deliberate migration — these files implement the Ω, ΩN, ΩE laws.

## Public surface

```ts
import {
  OmegaEngine,
  type OmegaInput,
  type OmegaOutput,
  type DomainAdapter,
} from '@omega/core';
```

- `OmegaEngine` — the reasoning entry point.
- `IntelligenceLayer` interface — every K/I/O/C/E/P/L layer implements it.
- `NexusLayer` interface — every H/N/S/AI layer implements it.
- `DomainAdapter` interface — every plug-in implements it.

## Laws

```
Ω  = lim_{U→0}(K × I × O × C × E × P × L)
ΩN = (H + N + S + AI) × Ω
ΩE = ΩN − Ω
```
