const { useState, useEffect, useMemo, useCallback } = React;
const RTO_SEC = 300;
const sevColor = { P1: 'bg-rose-600', P2: 'bg-amber-600', P3: 'bg-sky-600' };

function useRunbooks() {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  useEffect(() => {
    fetch('/api/runbooks').then((r) => r.json())
      .then((j) => (j.ok ? setData(j.data) : setError(j.error)))
      .catch((e) => setError(e.message));
  }, []);
  return { data, error };
}

function RunbookCard({ rb, onOpen, active }) {
  return (
    <button onClick={() => onOpen(rb)} className={`text-left w-full rounded-lg border p-3 transition ${active ? 'border-emerald-500 bg-slate-800' : 'border-slate-800 bg-slate-900 hover:border-slate-600'}`}>
      <div className="flex justify-between items-center">
        <b>{rb.rbId}</b><span className={`text-xs px-2 py-0.5 rounded ${sevColor[rb.severity]}`}>{rb.severity}</span>
      </div>
      <p className="text-sm mt-1">{rb.name}</p>
      <p className="text-xs text-slate-400 mt-1">{rb.category} &middot; {rb.steps.length} steps &middot; {rb.totalSec}s</p>
    </button>
  );
}

function StepTracker({ rb }) {
  const [done, setDone] = useState({});
  useEffect(() => setDone({}), [rb.rbId]);
  const toggle = useCallback((i) => setDone((d) => ({ ...d, [i]: !d[i] })), []);
  const elapsed = rb.steps.reduce((a, s, i) => a + (done[i] ? s.sec : 0), 0);
  const pct = Math.min(100, Math.round((elapsed / RTO_SEC) * 100));
  const over = rb.totalSec > RTO_SEC;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-lg font-semibold">{rb.rbId}: {rb.name}</h2>
      <p className={`text-sm mt-1 ${over ? 'text-rose-400' : 'text-emerald-400'}`}>
        Total {rb.totalSec}s vs RTO {RTO_SEC}s {over ? '- exceeds RTO (needs automation / parallel steps)' : '- within RTO'}
      </p>
      <div className="h-2 bg-slate-800 rounded mt-3"><div className="h-2 rounded bg-emerald-500" style={{ width: `${pct}%` }} /></div>
      <ol className="mt-4 space-y-3">
        {rb.steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <input type="checkbox" checked={!!done[i]} onChange={() => toggle(i)} className="mt-1" />
            <div className="flex-1">
              <p className={`text-sm ${done[i] ? 'line-through text-slate-500' : ''}`}>{i + 1}. {s.action} <span className="text-slate-400">({s.role}, ~{s.sec}s)</span></p>
              <code className="block text-xs bg-slate-950 rounded p-2 mt-1 overflow-x-auto whitespace-pre-wrap">{s.cmd}</code>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function App() {
  const { data, error } = useRunbooks();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => data.filter((r) =>
    (cat === 'all' || r.category === cat) && (r.name + r.rbId).toLowerCase().includes(q.toLowerCase())), [data, q, cat]);
  const cats = useMemo(() => ['all', ...new Set(data.map((r) => r.category))], [data]);

  if (error) return <p className="text-rose-400">Error: {error}</p>;
  return (
    <div className="grid md:grid-cols-[320px_1fr] gap-6">
      <aside className="space-y-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search runbooks..." className="w-full bg-slate-800 rounded p-2 text-sm" />
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="w-full bg-slate-800 rounded p-2 text-sm">
          {cats.map((c) => <option key={c}>{c}</option>)}
        </select>
        {filtered.map((rb) => <RunbookCard key={rb.rbId} rb={rb} active={selected?.rbId === rb.rbId} onOpen={setSelected} />)}
      </aside>
      <section>{selected ? <StepTracker rb={selected} /> : <p className="text-slate-400">Select a runbook to start a table-top (Arena Mode) drill.</p>}</section>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
