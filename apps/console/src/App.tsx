import { useConsoleStore } from './store.js';
import { QueryBox } from './components/QueryBox.js';
import { ReasoningChain } from './components/ReasoningChain.js';
import { UncertaintyMeter } from './components/UncertaintyMeter.js';

export const App = () => {
  const { result, error, domain, setDomain } = useConsoleStore();

  return (
    <div className="min-h-screen bg-omega-bg text-omega-text">
      <header className="border-b border-omega-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-mono text-lg">ΩE Console</h1>
          <select
            className="bg-omega-panel border border-omega-border rounded px-2 py-1 text-sm"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          >
            <option value="mock">mock</option>
          </select>
        </div>
        <UncertaintyMeter uncertainty={result?.uncertainty ?? 1} />
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <QueryBox />

        {error && (
          <div className="rounded border border-omega-danger bg-omega-panel p-3 text-omega-danger">
            {error}
          </div>
        )}

        {result && (
          <>
            <section>
              <h2 className="text-sm uppercase tracking-wider text-omega-muted mb-3">
                Reasoning chain
              </h2>
              <ReasoningChain steps={result.reasoning} />
            </section>

            <section className="rounded border border-omega-border bg-omega-panel p-4">
              <h2 className="text-sm uppercase tracking-wider text-omega-muted mb-2">
                Decision
              </h2>
              <pre className="font-mono text-xs whitespace-pre-wrap break-all">
                {JSON.stringify(result.decision, null, 2)}
              </pre>
              <div className="mt-3 text-sm">
                <span className="text-omega-muted">Confidence:</span>{' '}
                <span className="text-omega-accent">
                  {Math.round(result.confidence * 100)}%
                </span>
              </div>
            </section>

            <section className="rounded border border-omega-border bg-omega-panel p-4">
              <h2 className="text-sm uppercase tracking-wider text-omega-muted mb-2">
                Emergence (ΩE = ΩN − Ω)
              </h2>
              <div className="text-sm">
                Magnitude: {result.emergence.magnitude.toFixed(3)}
              </div>
              <ul className="list-disc list-inside text-sm text-omega-muted mt-2">
                {result.emergence.novelInsights.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  );
};
