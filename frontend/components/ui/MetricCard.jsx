export default function MetricCard({ label, value, note, icon: Icon, highlight }) {
  const sub = highlight ? "text-white/80" : "text-muted";
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${highlight ? "border-brand bg-brand text-white" : "border-line bg-card"}`}>
      <div className={`flex items-center justify-between text-sm ${sub}`}>
        {label}
        {Icon && (
          <span className={`grid size-9 place-items-center rounded-lg ${highlight ? "bg-white/20" : "bg-panel text-brand"}`}>
            <Icon size={16} />
          </span>
        )}
      </div>
      <p className="mt-3 text-4xl font-semibold">{value}</p>
      <p className={`mt-1 text-xs ${sub}`}>{note}</p>
    </div>
  );
}
