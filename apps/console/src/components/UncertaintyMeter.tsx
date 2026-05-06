interface Props {
  uncertainty: number;
}

export const UncertaintyMeter = ({ uncertainty }: Props) => {
  const pct = Math.round(uncertainty * 100);
  const color =
    uncertainty < 0.33 ? 'bg-omega-accent' : uncertainty < 0.66 ? 'bg-omega-warn' : 'bg-omega-danger';

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-omega-muted">Uncertainty</span>
      <div className="h-2 w-40 rounded bg-omega-border overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-sm">{pct}%</span>
    </div>
  );
};
