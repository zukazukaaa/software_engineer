import { useConsoleStore } from '../store.js';
import { reason } from '../api.js';

export const QueryBox = () => {
  const { query, domain, loading, setQuery, setResult, setLoading, setError } =
    useConsoleStore();

  const submit = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const out = await reason({ query, domain, layers: {}, nexus: {} });
      setResult(out);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded border border-omega-border bg-omega-panel p-4">
      <textarea
        className="w-full bg-omega-bg border border-omega-border rounded p-3 font-mono text-sm focus:outline-none focus:border-omega-accent"
        rows={3}
        placeholder="Ask ΩE..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="flex justify-end mt-3">
        <button
          onClick={submit}
          disabled={loading}
          className="px-4 py-2 rounded bg-omega-accent text-omega-bg font-medium disabled:opacity-50"
        >
          {loading ? 'Reasoning...' : 'Reason'}
        </button>
      </div>
    </div>
  );
};
