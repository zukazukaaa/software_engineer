import type { ReasoningStep } from '@omega/core';

interface Props {
  steps: ReasoningStep[];
}

const isNexus = (key: string): boolean => ['H', 'N', 'S', 'AI'].includes(key);

export const ReasoningChain = ({ steps }: Props) => {
  return (
    <ol className="space-y-2 font-mono text-sm">
      {steps.map((step, i) => {
        const omegaSeparator =
          i > 0 && !isNexus(steps[i - 1]!.layer) && isNexus(step.layer);
        return (
          <li key={`${step.layer}-${i}`}>
            {omegaSeparator && (
              <div className="text-omega-muted py-1">───── Ω complete; entering ΩN ─────</div>
            )}
            <div className="flex items-center gap-3 px-3 py-2 rounded bg-omega-panel border border-omega-border">
              <span className="w-12 text-omega-accent font-bold">{step.layer}</span>
              <span className="flex-1 text-omega-muted truncate">{step.reasoning}</span>
              <span className="text-omega-text">U: {step.uncertaintyAfter.toFixed(2)}</span>
            </div>
          </li>
        );
      })}
      <li>
        <div className="text-omega-muted py-1">───── ΩE = ΩN − Ω ─────</div>
      </li>
    </ol>
  );
};
