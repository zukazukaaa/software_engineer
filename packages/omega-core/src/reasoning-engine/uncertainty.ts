/**
 * Uncertainty quantification utilities.
 *
 * U is normalized to [0, 1] where 0 == full truth.
 *
 * Each layer reports residual uncertainty u_i ∈ [0, 1]. The combined
 * uncertainty is the multiplicative residual: U = Π u_i. This matches
 * Ω = lim_{U→0}(K × I × O × ...) — every confident layer drives U toward 0.
 */

export const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

/**
 * Combine residual uncertainties multiplicatively.
 * Empty input → max uncertainty (1).
 */
export const combineUncertainty = (residuals: number[]): number => {
  if (residuals.length === 0) return 1;
  return clamp01(residuals.reduce((acc, u) => acc * clamp01(u), 1));
};

/**
 * Convert uncertainty to confidence.
 */
export const confidenceFromUncertainty = (u: number): number => clamp01(1 - clamp01(u));
