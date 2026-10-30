export default function ProgressBar({ value, className = "" }) {
  return (
    <div className={`h-2 rounded-full bg-panel ${className}`}>
      <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}
