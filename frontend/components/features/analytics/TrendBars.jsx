// Simple CSS bar chart of recent scores (0-100).
export default function TrendBars({ values = [] }) {
  return (
    <div className="card">
      <h2 className="font-semibold">Score trend</h2>
      <div className="mt-5 flex h-40 items-end gap-3">
        {values.map((v, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1 text-xs text-muted">
            <div className="w-full rounded-t-lg bg-brand" style={{ height: `${v}%` }} />
            {Math.round(v)}
          </div>
        ))}
      </div>
    </div>
  );
}
